const web3 = require('web3');
const fs = require('fs');
const abiFederation = require('../../../abis/Federation.json');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');
const utils = require('./utils');
const scriptVersion = require('../../package.json').version;

module.exports = class Heartbeat {
    constructor(config, logger, Web3 = web3) {
        this.config = config;
        this.logger = logger;

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.federationContract = new this.mainWeb3.eth.Contract(abiFederation, this.config.mainchain.federation);
        this.transactionSender = new TransactionSender(this.mainWeb3, this.logger, this.config);
        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
    }

    async run() {
        let retries = 3;
        const sleepAfterRetrie = 3000;
        while(retries > 0) {
            try {
                const [
                    currentBlockRSK,
                    currentBlockETH,
                    nodeInfo
                ] =
                await Promise.all([
                    this.mainWeb3.eth.getBlockNumber(),
                    this.sideWeb3.eth.getBlockNumber(),
                    this.sideWeb3.eth.getNodeInfo()
                ]);

                return await this._emitHeartbeat(
                    currentBlockRSK,
                    currentBlockETH,
                    scriptVersion,
                    nodeInfo
                );
            } catch (err) {
                console.log(err)
                this.logger.error(new Error('Exception Running Heartbeat'), err);
                retries--;
                this.logger.debug(`Run ${3-retries} retrie`);
                if(retries > 0) {
                    await utils.sleep(sleepAfterRetrie);
                } else {
                    process.exit();
                }
            }
        }
    }

    async _emitHeartbeat(fedRskBlock, fedEthBlock, fedVSN, nodeInfo) {
        try {
            
            let txData = await this.federationContract.methods.emitHeartbeat(
                fedRskBlock,
                fedEthBlock,
                fedVSN,
                nodeInfo
            ).encodeABI();

            this.logger.info(`emitHeartbeat(${fedRskBlock}, ${fedEthBlock}, ${fedVSN}, ${nodeInfo})`);
            await this.transactionSender.sendTransaction(this.federationContract.options.address, txData, 0, this.config.privateKey);
            this.logger.info(`Success emiting heartbeat`);
            return true;
        } catch (err) {
            throw new CustomError(`Exception Emiting Hearbeat rskBlock: ${fedRskBlock} ethBlock: ${fedEthBlock} fedVSN: ${fedVSN}`, err);
        }
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value);
        }
    }
}
