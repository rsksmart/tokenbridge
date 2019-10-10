const Web3 = require('web3');
const abiBridge = require('../../abis/Bridge.json');
const abiMultiSig = require('../../abis/MultiSig.json');
const TransactionSender = require('../services/TransactionSender');

module.exports = class Federator {
    constructor(config, logger, id) {
        this.config = config;
        this.logger = logger;

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.bridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
        this.multiSigContract = new this.sideWeb3.eth.Contract(abiMultiSig, this.config.sidechain.multisig);

        this.federatorConfig = config.members[id];
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

            let fromBlock = null;
            try {
                fromBlock = fs.readFileSync(this.lastBlockPath, 'utf8');
                fromBlock++;
            } catch(err) {
                fromBlock = this.config.fromBlock || '0x01';
            }
            this.logger.debug('Running from Block', fromBlock);

            const logs = await this.bridgeContract.getPastEvents('Cross', {
                fromBlock,
                toBlock
            });
            this.logger.info(`Found ${logs.length} logs`);

            await this._processLogs(logs);
        } catch (err) {
            this.logger.error(new CustomError('Exception Running Federator', err));
            process.exit();
        }
    }

    async _processLogs(logs) {
        const transactionSender = new TransactionSender(this.sideWeb3, this.logger);
        const bridgeAddress = `0x${sabi.encodeValue(this.config.mainchain.bridge)}`;

        let lastBlockNumber = null;

        for(let log of logs) {
            if (log.topics[2] === bridgeAddress) {
                this.logger.info(`Processing event log: ${log}`);

                const originalReceiver = log.topics[1];
                const receiver = await this.bridgeContract.methods.getMappedAddress(originalReceiver);
                this.logger.info(`Sidechain receiver: ${receiver}`);

                const value = log.returnValues._amount;
                this.logger.info(`Transfering: ${value}`);

                let data = multiSigContract.methods.submitTransaction(receiver, value, log.data).encodeABI();
                await transactionSender.sendTransaction(multiSigContract.options.address, data, 0, this.federatorConfig.privateKey);

                lastBlockNumber = log.blockNumber;
            }
        }

        fs.writeFileSync(this.lastBlockPath, lastBlockNumber);
    }
}

