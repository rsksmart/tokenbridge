const web3 = require('web3');
const fs = require('fs');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');
const GenericFederation = require('./GenericFederation');
const GenericBridge = require('./GenericBridge');
const utils = require('./utils');

module.exports = class Federator {
    constructor(config, logger, Web3 = web3) {

        this.config = config;
        this.logger = logger;

        if (!utils.checkHttpsOrLocalhost(config.mainchain.host)) {
            throw new Error(`Invalid host configuration, https or localhost required`);
        }

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.mainBridgeContract = null;
        this.sideBridgeContract = null;
        this.federationContract = null;

        this.transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
    }

    async getFederationContract() {
        if (this.federationContract === null) {
            try {

                const {
                  sideBridge
                } = await this.getBridgeContract()

                const federationAddress =
                    await sideBridge.getFederation().call();

                this.federationContract = await GenericFederation.getInstance(
                    this.sideWeb3.eth.Contract,
                    federationAddress
                );
            } catch(err) {
                throw new CustomError(`Exception getting Federation address`, err);
            }
        }

        return this.federationContract;
    }

    async getBridgeContract() {
        if (this.mainBridgeContract === null || this.sideBridgeContract === null) {
            let mainBridgeContract;
            let sideBridgeContract;

            try {
                mainBridgeContract = await GenericBridge.getInstance(
                    this.mainWeb3.eth.Contract,
                    this.config.mainchain.bridge
                );

                sideBridgeContract = await GenericBridge.getInstance(
                    this.sideWeb3.eth.Contract,
                    this.config.sidechain.bridge
                );

                this.mainBridgeContract = mainBridgeContract;
                this.sideBridgeContract = sideBridgeContract;
            } catch(err) {
                throw new CustomError(`Exception creating Bridge Contracts`, err);
            }
        }

        return {
            mainBridge: this.mainBridgeContract,
            sideBridge: this.sideBridgeContract
        }

    }

    async run() {
        let retries = 3;
        const sleepAfterRetrie = 3000;
        while(retries > 0) {
            try {
                const currentBlock = await this.mainWeb3.eth.getBlockNumber();
                const sideCurrentBlock = await this.sideWeb3.eth.getBlockNumber();
                const chainId = await this.mainWeb3.eth.net.getId();
                const {
                    mainBridge,
                    sideBridge
                } = await this.getBridgeContract();
                let confirmations = 0; //for rsk regtest and ganache

                if(chainId == 31 || chainId == 42) { // rsk testnet and kovan
                    confirmations = 10
                }
                if(chainId == 1) { //ethereum mainnet 24hs
                    confirmations = 5760
                }
                if(chainId == 30) { // rsk mainnet 24hs
                    confirmations = 2880
                }
                const toBlock = currentBlock - confirmations;
                this.logger.info('Running to Block', toBlock);

                if (toBlock <= 0) {
                    return false;
                }

                if (!fs.existsSync(this.config.storagePath)) {
                    fs.mkdirSync(this.config.storagePath);
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

                var fromPageBlock = fromBlock;
                for(var currentPage = 1; currentPage <= numberOfPages; currentPage++) { 
                    var toPagedBlock = fromPageBlock + recordsPerPage-1;
                    if(currentPage == numberOfPages) {
                        toPagedBlock = toBlock
                    }
                    this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
                    const logs = await mainBridge.getPastEvents('Cross', {
                        fromBlock: fromPageBlock,
                        toBlock: toPagedBlock
                    });
                    if (!logs) throw new Error('Failed to obtain the logs');

                    this.logger.info(`Found ${logs.length} logs`);
                    await this._processLogs(logs, toPagedBlock);
                    fromPageBlock = toPagedBlock + 1;

                    // when this.mainBridgeContract lives in RSK ...
                    if (utils.checkIfItsInRSK(chainId)) {
                        const heartbeatLogs = await mainBridge.getPastEvents('HeartBeat', {
                            fromBlock: fromPageBlock,
                            toBlock: toPagedBlock
                        });

                        if (!heartbeatLogs) throw new Error('Failed to obtain HeartBeat logs');
                        await this._processHeartbeatLogs(
                            heartbeatLogs,
                            toPagedBlock,
                            {
                                ethLastBlock: sideCurrentBlock
                            }
                        );
                    }
                }

                return true;
            } catch (err) {
                console.log(err)
                this.logger.error(new Error('Exception Running Federator'), err);
                retries--;
                this.logger.debug(`Run ${3-retries} retrie`);
                if( retries > 0) {
                    await utils.sleep(sleepAfterRetrie);
                } else {
                    process.exit();
                }
            }
        }
    }

    async _processLogs(logs, toBlock) {
        try {
            const transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
            const from = await transactionSender.getAddress(this.config.privateKey);
            let fedContract = await this.getFederationContract();

            for(let log of logs) {
                this.logger.info('Processing event log:', log);

                const {
                    blockHash,
                    transactionHash,
                    logIndex
                } = log;

                const {
                    _to: receiver,
                    _from: crossFrom,
                    _amount: amount,
                    _symbol: symbol,
                    _tokenAddress: tokenAddress,
                    _decimals: decimals,
                    _granularity: granularity
                } = log.returnValues;

                let transactionId = await fedContract.getTransactionId({
                    originalTokenAddress: tokenAddress,
                    sender: crossFrom,
                    receiver,
                    amount,
                    symbol,
                    blockHash,
                    transactionHash,
                    logIndex,
                    decimals,
                    granularity
                }).call();
                this.logger.info('get transaction id:', transactionId);

                let wasProcessed = await fedContract.transactionWasProcessed(transactionId).call();
                if (!wasProcessed) {
                    let hasVoted = await fedContract.hasVoted(transactionId).call({from: from});
                    if(!hasVoted) {
                        this.logger.info(`Voting tx: ${log.transactionHash} block: ${log.blockHash} token: ${symbol}`);
                        await this._voteTransaction(
                            tokenAddress,
                            crossFrom,
                            receiver,
                            amount,
                            symbol,
                            log.blockHash,
                            log.transactionHash,
                            log.logIndex,
                            decimals,
                            granularity
                        );
                    } else {
                        this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} token: ${symbol}  has already been voted by us`);
                    }
                } else {
                    this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} token: ${symbol} was already processed`);
                }
            }
            this._saveProgress(this.lastBlockPath, toBlock);

            return true;
        } catch (err) {
            throw new CustomError(`Exception processing logs`, err);
        }
    }

    async _processHeartbeatLogs(logs, toBlock, { ethLastBlock }) {
        /*
            if node it's not synchronizing, do ->
        */

        try {
            for(let log of logs) {
                this.logger.info('Processing Heartbeat event log:', log);

                const {
                    blockHash,
                    transactionHash,
                    logIndex,
                    blockNumber
                } = log;

                const {
                    sender,
                    fedRskBlock,
                    fedEthBlock,
                    federationVersion,
                    nodeRskInfo,
                    nodeEthInfo
                } = log.returnValues;

                let logInfo = `[sender: ${sender}],`;
                logInfo    += `[fedRskBlock: ${fedRskBlock}],`;
                logInfo    += `[fedEthBlock: ${fedEthBlock}],`;
                logInfo    += `[federationVersion: ${federationVersion}],`;
                logInfo    += `[nodeRskInfo: ${nodeRskInfo}],`;
                logInfo    += `[nodeEthInfo: ${nodeEthInfo}],`;
                logInfo    += `[blockNumber: ${blockNumber}],`;
                logInfo    += `[RskBlockGap: ${blockNumber - fedRskBlock}],`;
                logInfo    += `[EstEthBlockGap: ${ethLastBlock - fedEthBlock}]`;

                this.logger.info(logInfo);
            }

            this._saveProgress(this.lastBlockPath, toBlock);

            return true;
        } catch (err) {
            throw new CustomError(`Exception processing HeartBeat logs`, err);
        }
    }

    async _voteTransaction(tokenAddress, sender, receiver, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity) {
        try {

            const { sideBridge } = await this.getBridgeContract();
            const fedContract = await this.getFederationContract();

            const transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
            this.logger.info(`Voting Transfer ${amount} of ${symbol} trough sidechain bridge ${sideBridge.getAddress()} to receiver ${receiver}`);

            let txId = await fedContract.getTransactionId({
                originalTokenAddress: tokenAddress,
                sender,
                receiver,
                amount,
                symbol,
                blockHash,
                transactionHash,
                logIndex,
                decimals,
                granularity
            }).call();
            
            let txData = await fedContract.voteTransaction({
                originalTokenAddress: tokenAddress,
                sender,
                receiver,
                amount,
                symbol,
                blockHash,
                transactionHash,
                logIndex,
                decimals,
                granularity
            }).encodeABI();

            await transactionSender.sendTransaction(fedContract.getAddress(), txData, 0, this.config.privateKey);
            return true;
        } catch (err) {
            throw new CustomError(`Exception Voting tx:${transactionHash} block: ${blockHash} token ${symbol}`, err);
        }
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value);
        }
    }
}
