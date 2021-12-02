import { Logger } from 'log4js';
import { Config } from './config';
import { MetricCollector } from './MetricCollector';

import web3 from 'web3';
import fs from 'fs';
import TransactionSender from './TransactionSender';
import CustomError from './CustomError';
import { BridgeFactory } from '../contracts/BridgeFactory';
import { FederationFactory } from '../contracts/FederationFactory';
import { AllowTokensFactory } from '../contracts/AllowTokensFactory';
import utils from './utils';
import * as typescriptUtils from './typescriptUtils';
import { IFederationV3 } from '../contracts/IFederationV3';
import { IFederationV2 } from '../contracts/IFederationV2';
import { IAllowTokensV0 } from '../contracts/IAllowTokensV0';
import { IAllowTokensV1 } from '../contracts/IAllowTokensV1';

export default class Federator {
  public logger: Logger;
  public config: Config;
  public mainWeb3: web3;
  public sideWeb3: web3;
  public sideFederationAddress: string = null;
  public transactionSender: TransactionSender;
  public lastBlockPath: string;
  public revertedTxnsPath: string;
  public bridgeFactory: BridgeFactory;
  public federationFactory: FederationFactory;
  public allowTokensFactory: AllowTokensFactory;
  public metricCollector: MetricCollector;
  public chainId: number;
  public numberOfRetries: number;

  constructor(config: Config, logger: Logger, metricCollector: MetricCollector) {
    this.config = config;
    this.logger = logger;

    if (config.checkHttps && !utils.checkHttpsOrLocalhost(config.mainchain.host)) {
      this.logger.info('Check of checkHttpsOrLocalhost failed');
      throw new Error(`Invalid host configuration, https or localhost required`);
    }

    this.mainWeb3 = new web3(config.mainchain.host);
    this.sideWeb3 = new web3(config.sidechain.host);

    this.sideFederationAddress = null;

    this.transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
    this.lastBlockPath = `${config.storagePath}/lastBlock.txt`;
    this.revertedTxnsPath = `${config.storagePath}/revertedTxns.json`;
    this.bridgeFactory = new BridgeFactory(this.config, this.logger);
    this.federationFactory = new FederationFactory(this.config, this.logger);
    this.allowTokensFactory = new AllowTokensFactory(this.config, this.logger);
    this.metricCollector = metricCollector;
    this.numberOfRetries = config.federatorRetries;
  }

  async getCurrentChainId() {
    if (this.chainId === undefined) {
      this.chainId = await this.mainWeb3.eth.net.getId();
    }
    return this.chainId;
  }

  getFromBlock(): number {
    let fromBlock: number = null;
    try {
      fromBlock = parseInt(fs.readFileSync(this.lastBlockPath, 'utf8'));
    } catch (err) {
      fromBlock = this.config.mainchain.fromBlock;
    }
    if (fromBlock < this.config.mainchain.fromBlock) {
      fromBlock = this.config.mainchain.fromBlock;
    }
    return fromBlock;
  }

  checkStoragePath() {
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, {
        recursive: true,
      });
    }
  }

  async run(): Promise<boolean> {
    while (this.numberOfRetries > 0) {
      try {
        const currentBlock = await this.mainWeb3.eth.getBlockNumber();
        const chainId = await this.getCurrentChainId();

        const isMainSyncing = await this.mainWeb3.eth.isSyncing();
        if (isMainSyncing !== false) {
          this.logger.warn(
            `ChainId ${chainId} is Syncing, ${JSON.stringify(
              isMainSyncing,
            )}. Federator won't process requests till is synced`,
          );
          return false;
        }

        const isSideSyncing = await this.sideWeb3.eth.isSyncing();
        if (isSideSyncing !== false) {
          const sideChainId = await this.sideWeb3.eth.net.getId();
          this.logger.warn(
            `ChainId ${sideChainId} is Syncing, ${JSON.stringify(
              isSideSyncing,
            )}. Federator won't process requests till is synced`,
          );
          return false;
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

        this.checkStoragePath();

        let fromBlock = this.getFromBlock();
        if (fromBlock >= toBlock && fromBlock >= newToBlock) {
          this.logger.warn(
            `Current chain ${chainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`,
          );
          return false;
        }
        fromBlock = fromBlock + 1;
        this.logger.debug('Running from Block', fromBlock);
        await this.getLogsAndProcess(fromBlock, toBlock, currentBlock, false, confirmations);
        const lastBlockProcessed = toBlock;

        this.logger.debug('Started the second Log and Process', newToBlock);
        await this.getLogsAndProcess(lastBlockProcessed, newToBlock, currentBlock, true, confirmations);

        this.resetRetries();
        return true;
      } catch (err) {
        this.logger.error(new Error('Exception Running Federator'), err);
        this.numberOfRetries--;
        this.logger.debug(`Runned ${this.config.federatorRetries - this.numberOfRetries} retrie`);
        this.checkRetries();
        await utils.sleep(this.config.mainchain.blockTimeMs);
      }
    }
    return true;
  }

  checkRetries() {
    if (this.numberOfRetries < 0) {
      process.exit(1);
    }
  }

  resetRetries() {
    this.numberOfRetries = this.config.federatorRetries;
  }

  async getLogsAndProcess(fromBlock, toBlock, currentBlock, medmiumAndSmall: boolean, confirmations) {
    if (fromBlock >= toBlock) {
      return;
    }

    const mainBridge = await this.bridgeFactory.getMainBridgeContract();

    const recordsPerPage = 1000;
    const numberOfPages = Math.ceil((toBlock - fromBlock) / recordsPerPage);
    this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

    let fromPageBlock = fromBlock;
    for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
      let toPagedBlock = fromPageBlock + recordsPerPage - 1;
      if (currentPage === numberOfPages) {
        toPagedBlock = toBlock;
      }
      this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
      const logs = await mainBridge.getPastEvents('Cross', {
        fromBlock: fromPageBlock,
        toBlock: toPagedBlock,
      });
      if (!logs) {
        throw new Error('Failed to obtain the logs');
      }

      this.logger.info(`Found ${logs.length} logs`);
      await this._processLogs(logs, currentBlock, medmiumAndSmall, confirmations);
      if (!medmiumAndSmall) {
        this._saveProgress(this.lastBlockPath, toPagedBlock);
      }
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async checkFederatorIsMember(sideFedContract: IFederationV3 | IFederationV2, federatorAddress: string) {
    const isMember = await typescriptUtils.retryNTimes(sideFedContract.isMember(federatorAddress));
    if (!isMember) {
      throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
    }
  }

  async processLog(
    log: any,
    confirmations: { largeAmountConfirmations: number; mediumAmountConfirmations: number },
    sideFedContract: IFederationV3 | IFederationV2,
    allowTokens: IAllowTokensV1 | IAllowTokensV0,
    currentBlock: number,
    federatorAddress: string,
    mediumAndSmall: boolean,
  ): Promise<boolean> {
    this.logger.info('Processing event log:', log);

    const { blockHash, transactionHash, logIndex, blockNumber } = log;

    const {
      _to: receiver,
      _from: crossFrom,
      _amount: amount,
      _symbol: symbol,
      _tokenAddress: tokenAddress,
      _decimals: decimals,
      _granularity: granularity,
      _typeId: typeId,
      originChainId: originChainIdStr,
      destinationChainId: destinationChainIdStr,
    } = log.returnValues;

    const originChainId = Number(originChainIdStr);
    const destinationChainId = Number(destinationChainIdStr);
    const originBridge = await this.bridgeFactory.getMainBridgeContract();
    const sideTokenAddress = await utils.retry3Times(
      originBridge.getMappedToken({
        originalTokenAddress: tokenAddress,
        chainId: destinationChainIdStr,
      }).call,
    );

    let allowed: number, mediumAmount: number, largeAmount: number;
    if (sideTokenAddress === utils.zeroAddress) {
      ({ allowed, mediumAmount, largeAmount } = await allowTokens.getLimits({
        tokenAddress: tokenAddress,
      }));
      if (!allowed) {
        throw new Error(
          `Original Token not allowed nor side token Tx:${transactionHash} originalTokenAddress:${tokenAddress}
            Bridge Contract Addr ${originBridge}`,
        );
      }
    } else {
      ({ allowed, mediumAmount, largeAmount } = await allowTokens.getLimits({
        tokenAddress: sideTokenAddress,
      }));
      if (!allowed) {
        this.logger.error(
          `Side token:${sideTokenAddress} needs to be allowed Tx:${transactionHash} originalTokenAddress:${tokenAddress}`,
        );
      }
    }

    const mediumAmountBN = web3.utils.toBN(mediumAmount);
    const largeAmountBN = web3.utils.toBN(largeAmount);
    const amountBN = web3.utils.toBN(amount);

    if (mediumAndSmall) {
      // At this point we're processing blocks newer than largeAmountConfirmations
      // and older than smallAmountConfirmations
      if (amountBN.gte(largeAmountBN)) {
        const c = currentBlock - blockNumber;
        const rC = confirmations.largeAmountConfirmations;
        this.logger.debug(
          `[large amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`,
        );
        return false;
      }

      if (amountBN.gte(mediumAmountBN) && currentBlock - blockNumber < confirmations.mediumAmountConfirmations) {
        const c = currentBlock - blockNumber;
        const rC = confirmations.mediumAmountConfirmations;
        this.logger.debug(
          `[medium amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`,
        );
        return false;
      }
    }

    const transactionId = await typescriptUtils.retryNTimes(
      sideFedContract.getTransactionId({
        originalTokenAddress: tokenAddress,
        sender: crossFrom,
        receiver,
        amount,
        blockHash,
        transactionHash,
        logIndex,
        originChainId,
        destinationChainId,
      }),
    );
    this.logger.info('get transaction id:', transactionId);

    const wasProcessed = await typescriptUtils.retryNTimes(sideFedContract.transactionWasProcessed(transactionId));
    if (!wasProcessed) {
      const hasVoted = await sideFedContract.hasVoted(transactionId, federatorAddress);
      if (!hasVoted) {
        this.logger.info(
          `Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${tokenAddress}`,
        );
        await this._voteTransaction({
          sideFedContract,
          tokenAddress,
          sender: crossFrom,
          receiver,
          amount,
          symbol,
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          decimals,
          granularity,
          typeId,
          txId: transactionId,
          federatorAddress,
          originChainId,
          destinationChainId,
        });
      } else {
        this.logger.debug(
          `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress}  has already been voted by us`,
        );
      }
    } else {
      this.logger.debug(
        `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${tokenAddress} was already processed`,
      );
    }
    return true;
  }

  async _processLogs(
    logs,
    currentBlock,
    mediumAndSmall,
    confirmations: { mediumAmountConfirmations: number; largeAmountConfirmations: number },
  ) {
    try {
      const federatorAddress = await this.transactionSender.getAddress(this.config.privateKey);
      const sideFedContract = await this.federationFactory.getSideFederationContract();
      const allowTokens = await this.allowTokensFactory.getMainAllowTokensContract();

      await this.checkFederatorIsMember(sideFedContract, federatorAddress);

      for (const log of logs) {
        await this.processLog(
          log,
          confirmations,
          sideFedContract,
          allowTokens,
          currentBlock,
          federatorAddress,
          mediumAndSmall,
        );
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing logs`, err);
    }
  }

  async _voteTransaction({
    sideFedContract,
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
    txId,
    federatorAddress,
    originChainId,
    destinationChainId,
  }) {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `TransactionId ${txId} Voting Transfer ${amount} of originalTokenAddress:${tokenAddress} trough sidechain bridge ${this.config.sidechain.bridge} to receiver ${receiver}`,
      );

      const txDataAbi = await sideFedContract.getVoteTransactionABI({
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
        originChainId,
        destinationChainId,
      });

      let revertedTxns = {};
      if (fs.existsSync(this.revertedTxnsPath)) {
        revertedTxns = JSON.parse(fs.readFileSync(this.revertedTxnsPath, 'utf8'));
        this.logger.info(`read these transactions from reverted transactions file`, revertedTxns);
      }

      if (revertedTxns[txId]) {
        this.logger.info(
          `Skipping Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} since it's marked as reverted.`,
          revertedTxns[txId],
        );
        return false;
      }

      this.logger.info(
        `Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} was not reverted.`,
      );

      const receipt = await this.transactionSender.sendTransaction(
        sideFedContract.getAddress(),
        txDataAbi,
        0,
        this.config.privateKey,
      );

      if (!receipt.status) {
        this.logger.info(
          `Voting ${amount} of originalTokenAddress:${tokenAddress} TransactionId ${txId} failed, check the receipt`,
          receipt,
        );

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
              granularity,
            },
          }),
        );
      }

      await this.trackTransactionResultMetric(receipt.status, federatorAddress);

      return true;
    } catch (err) {
      throw new CustomError(
        `Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${tokenAddress}`,
        err,
      );
    }
  }

  async trackTransactionResultMetric(wasTransactionVoted, federatorAddress) {
    const federator = await this.federationFactory.getSideFederationContract();
    this.metricCollector?.trackERC20FederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federator.getVersion(),
      await this.getCurrentChainId(),
    );
  }

  _saveProgress(path, value) {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }
}
