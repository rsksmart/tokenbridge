const web3 = require('web3');
const fs = require('fs');
const abiFederation = require('../../../abis/Federation.json');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');
const BridgeFactory = require('./BridgeFactory');
const FederationFactory = require('./FederationFactory');
const utils = require('./utils');
const scriptVersion = require('../../package.json').version;

module.exports = class Heartbeat {
    constructor(config, logger, Web3 = web3) {
        this.config = config;
        this.logger = logger;

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.transactionSender = new TransactionSender(this.mainWeb3, this.logger, this.config);
        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
        this.bridgeFactory = new BridgeFactory(this.config, this.logger, Web3);
        this.federationFactory = new FederationFactory(this.config, this.logger, Web3);
    }

    async run() {
        const chainId = await this.mainWeb3.eth.net.getId();
        if (!utils.checkIfItsInRSK(chainId)) {
            this.logger.error(new Error('Heartbeat should only run on RSK'), err);
            process.exit();
        }
        let retries = 3;
        const sleepAfterRetrie = 3000;
        while(retries > 0) {
            try {
                const [
                    currentBlockRSK,
                    currentBlockETH,
                    nodeRskInfo,
                    nodeEthInfo
                ] =
                await Promise.all([
                    this.mainWeb3.eth.getBlockNumber(),
                    this.sideWeb3.eth.getBlockNumber(),
                    this.mainWeb3.eth.getNodeInfo(),
                    this.sideWeb3.eth.getNodeInfo()
                ]);

                return await this._emitHeartbeat(
                    currentBlockRSK,
                    currentBlockETH,
                    scriptVersion,
                    nodeRskInfo,
                    nodeEthInfo
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

    async _emitHeartbeat(fedRskBlock, fedEthBlock, fedVersion, nodeRskInfo, nodeEthInfo) {
        try {
            const fedContract = await this.federationFactory.getMainFederationContract();

            await fedContract.emitHeartbeat(
                this.transactionSender,
                fedRskBlock,
                fedEthBlock,
                fedVersion,
                nodeRskInfo,
                nodeEthInfo
            )
            
            this.logger.info(`emitHeartbeat(${fedRskBlock}, ${fedEthBlock}, ${fedVSN}, ${nodeRskInfo}, ${nodeEthInfo})`);
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
