const web3 = require('web3');
const fs = require('fs');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');
const BridgeFactory = require('../contracts/BridgeFactory');
const FederationFactory = require('../contracts/FederationFactory');
const utils = require('./utils');
const scriptVersion = process.env.npm_package_version;

module.exports = class Heartbeat {
    constructor(config, logger, metricCollector, Web3 = web3) {
        this.config = config;
        this.logger = logger;

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.transactionSender = new TransactionSender(this.mainWeb3, this.logger, this.config);
        this.lastBlockPath = `${config.storagePath || __dirname}/heartBeatLastBlock.txt`;
        this.bridgeFactory = new BridgeFactory.BridgeFactory(this.config, this.logger);
        this.federationFactory = new FederationFactory.FederationFactory(this.config, this.logger);
        this.metricCollector = metricCollector;
    }

    async run() {
        await this._checkIfRsk()
        let retries = 3;
        const sleepAfterRetryMs = 3000;
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
                this.logger.debug(`Run ${3-retries} retry`);
                if(retries > 0) {
                    await utils.sleep(sleepAfterRetryMs);
                } else {
                    process.exit(1);
                }
            }
        }
    }

    async readLogs() {
        await this._checkIfRsk();
        let retries = 3;
        const sleepAfterRetrie = 3000;
        while(retries > 0) {
            try {
                const currentBlock = await this.mainWeb3.eth.getBlockNumber();
                const fedContract = await this.federationFactory.getMainFederationContract();

                const toBlock = currentBlock;
                this.logger.info('Running to Block', toBlock);

                if (toBlock <= 0) {
                    return false;
                }

                if (!fs.existsSync(this.config.storagePath)) {
                    await fs.mkdirSync(this.config.storagePath, {
                        recursive: true
                    });
                }
                let originalFromBlock = this.config.mainchain.fromBlock || 0;
                let fromBlock = null;
                try {
                    fromBlock = fs.readFileSync(this.lastBlockPath, 'utf8');
                } catch(err) {
                    fromBlock = originalFromBlock;
                }
                if(fromBlock < originalFromBlock) {
                    fromBlock = originalFromBlock;
                }
                if(fromBlock >= toBlock){
                    this.logger.warn(`Current chain Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`);
                    return false;
                }
                fromBlock = parseInt(fromBlock)+1;
                this.logger.debug('Running from Block', fromBlock);

                const recordsPerPage = 1000;
                const numberOfPages = Math.ceil((toBlock - fromBlock) / recordsPerPage);
                this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

                let fromPageBlock = fromBlock;
                for(let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
                    let toPagedBlock = fromPageBlock + recordsPerPage - 1;
                    if(currentPage === numberOfPages) {
                        toPagedBlock = toBlock;
                    }

                    this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
                    const heartbeatLogs = await fedContract.getPastEvents('HeartBeat', {
                        fromBlock: fromPageBlock,
                        toBlock: toPagedBlock
                    });

                    if (!heartbeatLogs) throw new Error('Failed to obtain HeartBeat logs');
                    await this._processHeartbeatLogs(
                        heartbeatLogs,
                        {
                            ethLastBlock: await this.sideWeb3.eth.getBlockNumber()
                        }
                    );

                    this.logger.info(`Found ${heartbeatLogs.length} heartbeatLogs`);

                    this._saveProgress(this.lastBlockPath, toPagedBlock);
                    fromPageBlock = toPagedBlock + 1;
                }

                return true;
            } catch (err) {
                console.log(err);
                this.logger.error(new Error('Exception Running Federator'), err);
                retries--;
                this.logger.debug(`Run ${3-retries} retrie`);
                if( retries > 0) {
                    await utils.sleep(sleepAfterRetrie);
                } else {
                    process.exit(1);
                }
            }
        }
    }

    async _processHeartbeatLogs(logs, { ethLastBlock }) {
        /*
            if node it's not synchronizing, do ->
        */

        try {
            for(let log of logs) {

                const {
                    blockNumber
                } = log;

                const {
                    sender,
                    fedRskBlock,
                    fedEthBlock,
                    federatorVersion,
                    nodeRskInfo,
                    nodeEthInfo
                } = log.returnValues;

                let logInfo = `[event: HeartBeat],`;
                logInfo    += `[sender: ${sender}],`;
                logInfo    += `[fedRskBlock: ${fedRskBlock}],`;
                logInfo    += `[fedEthBlock: ${fedEthBlock}],`;
                logInfo    += `[federatorVersion: ${federatorVersion}],`;
                logInfo    += `[nodeRskInfo: ${nodeRskInfo}],`;
                logInfo    += `[nodeEthInfo: ${nodeEthInfo}],`;
                logInfo    += `[blockNumber: ${blockNumber}],`;
                logInfo    += `[RskBlockGap: ${blockNumber - fedRskBlock}],`;
                logInfo    += `[EstEthBlockGap: ${ethLastBlock - fedEthBlock}]`;

                this.logger.info(logInfo);
            }

            return true;
        } catch (err) {
            throw new CustomError(`Exception processing HeartBeat logs`, err);
        }
    }

    async _emitHeartbeat(fedRskBlock, fedEthBlock, fedVersion, nodeRskInfo, nodeEthInfo) {
        try {
            const fedContract = await this.federationFactory.getMainFederationContract();
            const from = await this.transactionSender.getAddress(this.config.privateKey);
            const isMember = await fedContract.isMember(from);
            if (!isMember) throw new Error(`This Federator addr:${from} is not part of the federation`);

            this.logger.info(`emitHeartbeat(${fedRskBlock}, ${fedEthBlock}, ${fedVersion}, ${nodeRskInfo}, ${nodeEthInfo})`);
            await fedContract.emitHeartbeat(
                this.transactionSender,
                fedRskBlock,
                fedEthBlock,
                fedVersion,
                nodeRskInfo,
                nodeEthInfo
            )
            this._trackHeartbeatMetrics(fedRskBlock, from, fedVersion, nodeRskInfo, fedEthBlock, nodeEthInfo);
            this.logger.info(`Success emitting heartbeat`);
            return true;
        } catch (err) {
            throw new CustomError(`Exception Emitting Heartbeat rskBlock: ${fedRskBlock} ethBlock: ${fedEthBlock} fedVersion: ${fedVersion}`, err);
        }
    }

    _trackHeartbeatMetrics(fedRskBlock, from, fedVersion, nodeRskInfo, fedEthBlock, nodeEthInfo) {
        this.mainWeb3.eth.net.getId().then(chainId => {
            this.metricCollector?.trackMainChainHeartbeatEmission(from, fedVersion, fedRskBlock, nodeRskInfo, chainId);
        });
        this.sideWeb3.eth.net.getId().then(chainId => {
            this.metricCollector?.trackSideChainHeartbeatEmission(from, fedVersion, fedEthBlock, nodeEthInfo, chainId);
        });
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value.toString());
        }
    }

    async _checkIfRsk() {
        const chainId = await this.mainWeb3.eth.net.getId();
        if (!utils.checkIfItsInRSK(chainId)) {
            this.logger.error(new Error(`Heartbeat should only run on RSK ${chainId}`));
            process.exit(1);
        }
    }
}
