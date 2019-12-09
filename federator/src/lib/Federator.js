const web3 = require('web3');
const fs = require('fs');
const abiBridge = require('../abis/Bridge_v0.json');
const abiFederation = require('../abis/Federation.json');
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
        this.federationContract = new this.sideWeb3.eth.Contract(abiFederation, this.config.sidechain.federation);

        this.transactionSender = new TransactionSender(this.sideWeb3, this.logger);

        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
    }

    async run() {
        try {
            const currentBlock = await this.mainWeb3.eth.getBlockNumber();
            const toBlock = currentBlock - this.config.confirmations || 120;
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
            } catch(err) {
                fromBlock = this.config.mainchain.fromBlock || 0;
            }
            fromBlock = parseInt(fromBlock)+1;
            this.logger.debug('Running from Block', fromBlock);

            const logs = await this.mainBridgeContract.getPastEvents('Cross', {
                fromBlock,
                toBlock
            });
            if (!logs) return;

            this.logger.info(`Found ${logs.length} logs`);
            await this._processLogs(logs);

            return true;
        } catch (err) {
            this.logger.error(new CustomError('Exception Running Federator', err));
            console.log(err)
            process.exit();
        }
    }

    async _processLogs(logs = []) {
        try {
            let lastBlockNumber = null;
            const transactionSender = new TransactionSender(this.sideWeb3, this.logger);
            const from = await transactionSender.getAddress(this.config.privateKey);

            for(let log of logs) {
                this.logger.info('Processing event log:', log);

                const { _to: receiver, _amount: amount, _symbol: symbol, _tokenAddress: tokenAddress} = log.returnValues;
                let transactionId = await this.federationContract.methods.getTransactionId(
                    tokenAddress,
                    receiver,
                    amount,
                    symbol,
                    log.blockHash,
                    log.transactionHash,
                    log.logIndex
                ).call();

                let wasProcessed = await this.federationContract.methods.transactionWasProcessed(transactionId).call();
                if (!wasProcessed) {
                    let hasVoted = await this.federationContract.methods.hasVoted(transactionId).call({from: from});
                    if(!hasVoted) {
                        this.logger.info(`Voting tx: ${log.transactionHash} block: ${log.blockHash} token: ${symbol}`);
                        await this._voteTransaction(tokenAddress,
                            receiver,
                            amount,
                            symbol,
                            log.blockHash,
                            log.transactionHash,
                            log.logIndex);
                    } else {
                        this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} token: ${symbol}  has already been voted by us`);
                    }
                    
                } else {
                    this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} token: ${symbol} was already processed`);
                }

                lastBlockNumber = log.blockNumber;
            }

            this._saveProgress(this.lastBlockPath, lastBlockNumber);

            return true;
        } catch (err) {
            throw new Error(`Exception processing logs ${err}`);
        }
    }

    async _voteTransaction(tokenAddress, receiver, amount, symbol, blockHash, transactionHash, logIndex) {
        try {

            const transactionSender = new TransactionSender(this.sideWeb3, this.logger);
            this.logger.info(`Transfering ${amount} of ${symbol} trough sidechain bridge ${this.sideBridgeContract.options.address} to receiver ${receiver}`);

            let txData = await this.federationContract.methods.voteTransaction(
                tokenAddress,
                receiver,
                amount,
                symbol,
                blockHash,
                transactionHash,
                logIndex
            ).encodeABI();

            await transactionSender.sendTransaction(this.federationContract.options.address, txData, 0, this.config.privateKey);
            this.logger.info(`Voted Transaction: ${transactionHash} of block: ${blockHash} token ${symbol} to Federation Contract `);
            return true;
        } catch (err) {
            this.logger.info(`Exception Voting tx:${transactionHash} block: ${blockHash} token ${symbol}`,err);
        }
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value);
        }
    }
}
