const web3 = require('web3');
const fs = require('fs');
const abiBridge = require('../abis/Bridge_v0.json');
const abiMultiSig = require('../abis/MultiSig.json');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');

module.exports = class Federator {
    constructor(config, logger, Web3 = web3) {
        this.config = config;
        this.logger = logger;

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.mainBridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
        this.sideBridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
        this.multiSigContract = new this.sideWeb3.eth.Contract(abiMultiSig, this.config.sidechain.multisig);

        this.transactionSender = new TransactionSender(this.sideWeb3, this.logger);

        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
    }

    async run() {
        try {
            const currentBlock = await this.mainWeb3.eth.getBlockNumber();
            const toBlock = currentBlock - this.config.confirmations || 0;
            this.logger.info('Running to Block', toBlock);

            if (toBlock <= 0) {
                return false;
            }

            if (!fs.existsSync(this.config.storagePath)) {
                fs.mkdirSync(this.config.storagePath);
            }

            let fromBlock = null;
            try {
                fromBlock = fs.readFileSync(this.lastBlockPath, 'utf8');
                fromBlock++;
            } catch(err) {
                fromBlock = this.config.fromBlock || 0;
            }
            this.logger.debug('Running from Block', fromBlock);

            const logs = await this.mainBridgeContract.getPastEvents('Cross', {
                fromBlock,
                toBlock,
                filter: { _tokenAddress: this.config.mainchain.testToken }
            });
            if (!logs) return;

            this.logger.info(`Found ${logs.length} logs`);

            await this._confirmPendingTransactions();
            await this._processLogs(logs);

            return true;
        } catch (err) {
            this.logger.error(new CustomError('Exception Running Federator', err));
            console.log(err)
            process.exit();
        }
    }

    async _confirmPendingTransactions() {
        try {
            const transactionSender = new TransactionSender(this.sideWeb3, this.logger);
            const from = await transactionSender.getAddress(this.config.privateKey);

            let currentTransactionCount = await this.multiSigContract.methods.transactionCount().call();
            this.logger.info(`Checking pending transaction until tx ${currentTransactionCount}`);

            let pendingTransactions = await this.multiSigContract.methods.getTransactionIds(0, currentTransactionCount, true, false).call();

            if (pendingTransactions && pendingTransactions.length) {
                for (let pending of pendingTransactions) {
                    let wasConfirmed = await this.multiSigContract.methods.confirmations(pending, from).call();
                    if (!wasConfirmed) {
                        this.logger.info(`Confirm MultiSig Tx ${pending}`)
                        let txData = await this.multiSigContract.methods.confirmTransaction(pending).encodeABI();
                        await transactionSender.sendTransaction(this.multiSigContract.options.address, txData, 0, this.config.privateKey);
                    }
                }
            }
            return true;

        } catch (err) {
            throw new Error(`Exception while confirming previous txs ${err}`);
        }
    }

    async _processLogs(logs = []) {
        try {
            let lastBlockNumber = null;

            for(let log of logs) {
                this.logger.info('Processing event log:', log);

                const { returnValues } = log;
                const originalReceiver = returnValues._to;
                const receiver = await this.sideBridgeContract.methods.getMappedAddress(originalReceiver).call();
                console.log(log)
                let wasProcessed = await this.sideBridgeContract.methods.transactionWasProcessed(
                    log.blockHash,
                    log.transactionHash,
                    receiver,
                    log.returnValues._amount,
                    log.logIndex
                ).call();

                if (!wasProcessed) {
                    this.logger.info('Voting tx ', log.transactionHash);
                    await this._voteTransaction(log, receiver);
                }

                lastBlockNumber = log.blockNumber;
            }

            this._saveProgress(this.lastBlockPath, lastBlockNumber);

            return true;
        } catch (err) {
            throw new Error(`Exception processing logs ${err}`);
        }
    }

    async _voteTransaction(log, receiver) {
        try {
            if (!log || !receiver) {
                return false;
            }

            const transactionSender = new TransactionSender(this.sideWeb3, this.logger);
            const { _amount: amount, _symbol: symbol} = log.returnValues;
            this.logger.info(`Transfering ${amount} to sidechain bridge ${this.sideBridgeContract.options.address} to receiver ${receiver}`);

            let txTransferData = await this.sideBridgeContract.methods.acceptTransfer(
                this.config.mainchain.testToken,
                receiver,
                amount,
                symbol,
                log.blockHash,
                log.transactionHash,
                log.logIndex
            ).encodeABI();

            let txData = this.multiSigContract.methods.submitTransaction(this.sideBridgeContract.options.address, 0, txTransferData).encodeABI();
            await transactionSender.sendTransaction(this.multiSigContract.options.address, txData, 0, this.config.privateKey);
            this.logger.info(`Transaction ${log.transactionHash} submitted to multisig`);

            return true;
        } catch (err) {
            this.logger.info(`Exception Voting tx  ${err}`);
        }
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value);
        }
    }
}
