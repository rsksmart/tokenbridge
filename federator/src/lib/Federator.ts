import { Logger } from 'log4js'
import { Config } from '../../config/config'
import Web3 from 'web3';

const web3 = require('web3');
const fs = require('fs');
const TransactionSender = require('./TransactionSender');
const CustomError = require('./CustomError');
const BridgeFactory = require('../contracts/BridgeFactory');
const FederationFactory = require('../contracts/FederationFactory');
const AllowTokensFactory = require('../contracts/AllowTokensFactory');
const utils = require('./utils');

export class FederatorNFT {

  public logger: Logger;
  public config: Config;
  public mainWeb3: Web3;
  public sideWeb3: Web3;
  public sideFederationAddress: string = null;
  public transactionSender: typeof TransactionSender;
  public lastBlockPath: string;
  public revertedTxnsPath: string;
  public bridgeFactory: typeof BridgeFactory;
  public federationFactory: typeof FederationFactory;
  public allowTokensFactory: typeof AllowTokensFactory;

  constructor(config: Config, logger: Logger, Web3 = web3) {

        this.config = config;
        this.logger = logger;

        if (!utils.checkHttpsOrLocalhost(config.mainchain.host)) {
            throw new Error(`Invalid host configuration, https or localhost required`);
        }

        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);

        this.transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
        this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
        this.revertedTxnsPath = `${config.storagePath || __dirname}/revertedTxns.json`;
        this.bridgeFactory = new BridgeFactory(this.config, this.logger, Web3);
        this.federationFactory = new FederationFactory(this.config, this.logger, Web3);
        this.allowTokensFactory = new AllowTokensFactory(this.config, this.logger, Web3);
    }

    async run() {
        let retries = 3;
        const sleepAfterRetrie = 10_000;
        while(retries > 0) {
            try {
                const currentBlock = await this.mainWeb3.eth.getBlockNumber();
                const chainId = await this.mainWeb3.eth.net.getId();

                const isMainSyncing = await this.mainWeb3.eth.isSyncing();
                if (isMainSyncing !== false) {
                    this.logger.warn(`ChainId ${chainId} is Syncing, ${JSON.stringify(isMainSyncing)}. Federator won't process requests till is synced`);
                    return;
                }

                const isSideSyncing = await this.sideWeb3.eth.isSyncing();
                if (isSideSyncing !== false) {
                    const sideChainId = await this.sideWeb3.eth.net.getId();
                    this.logger.warn(`ChainId ${sideChainId} is Syncing, ${JSON.stringify(isSideSyncing)}. Federator won't process requests till is synced`);
                    return;
                }

                this.logger.debug(`Current Block ${currentBlock} ChainId ${chainId}`);
                const allowTokens = await this.allowTokensFactory.getMainAllowTokensContract();
                const confirmations = await allowTokens.getConfirmations();
                const toBlock = currentBlock - confirmations.largeAmountConfirmations;
                const newToBlock = currentBlock - confirmations.smallAmountConfirmations;

                this.logger.info('Running to Block', toBlock);

                if (toBlock <= 0 && newToBlock <= 0) {
                    return false;
                }

                if (!fs.existsSync(this.config.storagePath)) {
                    fs.mkdirSync(this.config.storagePath);
                }
                let originalFromBlock = parseInt(this.config.mainchain.fromBlock) || 0;
                let fromBlock = null;
                try {
                    fromBlock = parseInt(fs.readFileSync(this.lastBlockPath, 'utf8'));
                } catch(err) {
                    fromBlock = originalFromBlock;
                }
                if(fromBlock < originalFromBlock) {
                    fromBlock = originalFromBlock;
                }
                if(fromBlock >= toBlock && fromBlock >= newToBlock){
                    this.logger.warn(`Current chain ${chainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`);
                    return false;
                }
                fromBlock = fromBlock + 1;
                this.logger.debug('Running from Block', fromBlock);
                await this.getLogsAndProcess(fromBlock, toBlock, currentBlock, false, confirmations);
                let lastBlockProcessed = toBlock;
                await this.getLogsAndProcess(lastBlockProcessed, newToBlock, currentBlock, true, confirmations);

                return true;
            } catch (err) {
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

    async getLogsAndProcess(fromBlock, toBlock, currentBlock, medmiumAndSmall, confirmations) {
        if (fromBlock >= toBlock) return;

        const mainBridge = await this.bridgeFactory.getMainBridgeContract();

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
            await this._processLogs(logs, currentBlock, medmiumAndSmall, confirmations);
            if (!medmiumAndSmall) {
                this._saveProgress(this.lastBlockPath, toPagedBlock);
            }
            fromPageBlock = toPagedBlock + 1;
        }

    }

    async _processLogs(logs, currentBlock, mediumAndSmall, confirmations) {

        try {
            const from = await this.transactionSender.getAddress(this.config.privateKey);
            const fedContract = await this.federationFactory.getSideFederationContract();
            const allowTokens = await this.allowTokensFactory.getMainAllowTokensContract();

            const isMember = await utils.retry3Times(fedContract.isMember(from).call);
            if (!isMember) throw new Error(`This Federator addr:${from} is not part of the federation`);

            const {
                mediumAmountConfirmations,
                largeAmountConfirmations
            } = confirmations;

            for(let log of logs) {
                this.logger.info('Processing event log:', log);

                const {
                    blockHash,
                    transactionHash,
                    logIndex,
                    blockNumber
                } = log;

                const {
                    _to: receiver,
                    _from: crossFrom,
                    _amount: amount,
                    _symbol: symbol,
                    _tokenAddress: tokenAddress,
                    _decimals: decimals,
                    _granularity: granularity,
                    _typeId: typeId
                } = log.returnValues;

                const mainBridge = await this.bridgeFactory.getMainBridgeContract();
                const sideTokenAddress = await utils.retry3Times(mainBridge.getMappedToken(tokenAddress).call);
                let allowed,
                    mediumAmount,
                    largeAmount
                if (sideTokenAddress == utils.zeroAddress) {
                    ({
                        allowed,
                        mediumAmount,
                        largeAmount
                    } = await allowTokens.getLimits(tokenAddress));
                    if (!allowed) {
                        throw new Error(`Original Token not allowed nor side token Tx:${transactionHash} originalTokenAddress:${tokenAddress}`);
                    }
                } else {
                    ({
                        allowed,
                        mediumAmount,
                        largeAmount
                    } = await allowTokens.getLimits(sideTokenAddress));
                    if (!allowed) {
                        this.logger.error(`Side token:${sideTokenAddress} needs to be allowed Tx:${transactionHash} originalTokenAddress:${tokenAddress}`);
                    }
                }

                const BN = this.mainWeb3.utils.BN;
                const mediumAmountBN = new BN(mediumAmount);
                const largeAmountBN = new BN(largeAmount);
                const amountBN = new BN(amount);

                if (mediumAndSmall) {
                    // At this point we're processing blocks newer than largeAmountConfirmations
                    // and older than smallAmountConfirmations
                    if(amountBN.gte(largeAmountBN)) {
                        const c = currentBlock - blockNumber;
                        const rC = largeAmountConfirmations;
                        this.logger.debug(`[large amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`);
                        continue;
                    }

                    if((amountBN.gte(mediumAmountBN)) &&
                       (currentBlock - blockNumber < mediumAmountConfirmations)) {
                        const c = currentBlock - blockNumber;
                        const rC = mediumAmountConfirmations;
                        this.logger.debug(`[medium amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`);
                        continue;
                    }
                }

                let transactionId = await utils.retry3Times(fedContract.getTransactionId({
                    originalTokenAddress: tokenAddress,
                    sender: crossFrom,
                    receiver,
                    amount,
                    symbol,
                    blockHash,
                    transactionHash,
                    logIndex,
                    decimals,
                    granularity,
                    typeId
                }).call);
                this.logger.info('get transaction id:', transactionId);

                let wasProcessed = await utils.retry3Times(fedContract.transactionWasProcessed(transactionId).call);
                if (!wasProcessed) {
                    let hasVoted = await fedContract.hasVoted(transactionId).call({ from });
                    if(!hasVoted) {
                        this.logger.info(`Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${tokenAddress}`);
                        await this._voteTransaction(
                            fedContract,
                            tokenAddress,
                            crossFrom,
                            receiver,
                            amount,
                            symbol,
                            log.blockHash,
                            log.transactionHash,
                            log.logIndex,
                            decimals,
                            granularity,
                            typeId,
                            transactionId
                        );
                    } else {
                        this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress}  has already been voted by us`);
                    }
                } else {
                    this.logger.debug(`Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress} was already processed`);
                }
            }

            return true;
        } catch (err) {
            throw new CustomError(`Exception processing logs`, err);
        }
    }


    async _voteTransaction(
        fedContract,
        tokenAddress,
        sender,
        receiver,
        amount,
        symbol,
        blockHash,
        transactionHash,
        logIndex,
        decimals,
        granularity,
        typeId,
        txId
    ) {
        try {
            txId = txId.toLowerCase();
            this.logger.info(`Voting Transfer ${amount} of originalTokenAddress:${tokenAddress} trough sidechain bridge ${this.config.sidechain.bridge} to receiver ${receiver}`);

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
              granularity,
              typeId,
              tokenType: utils.tokenType.COIN,
            }).encodeABI();

            let revertedTxns = {};
            if (fs.existsSync(this.revertedTxnsPath)) {
                revertedTxns = JSON.parse(fs.readFileSync(this.revertedTxnsPath, 'utf8'));
                this.logger.info(`read these transactions from reverted transactions file`, revertedTxns);
            }

            if (revertedTxns[txId]) {
                this.logger.info(`Skipping Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} since it's marked as reverted.`, revertedTxns[txId])
                return false;
            }

            const receipt = await this.transactionSender.sendTransaction(fedContract.getAddress(), txData, 0, this.config.privateKey);

            if(receipt.status == false) {
                fs.writeFileSync(
                    this.revertedTxnsPath,
                    JSON.stringify({
                        ...revertedTxns,
                        [txId]: {
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
                        }
                    })
                )
            }

            return true;
        } catch (err) {
            throw new CustomError(`Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${tokenAddress}`, err);
        }
    }

    _saveProgress (path, value) {
        if (value) {
            fs.writeFileSync(path, value.toString());
        }
    }
}
