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
import Federator from './Federator';
import { ConfigChain } from './configChain';
import { BN } from 'ethereumjs-util';
import { IFederation } from '../contracts/IFederation';
import { IAllowTokens } from '../contracts/IAllowTokens';

export default class FederatorERC extends Federator {
  constructor(config: Config, logger: Logger, metricCollector: MetricCollector) {
    super(config, logger, metricCollector);
  }

  getFromBlock(sideChainId: number, mainChainId: number): number {
    let fromBlock: number = null;
    try {
      fromBlock = parseInt(fs.readFileSync(this.getLastBlockPath(sideChainId, mainChainId), 'utf8'));
    } catch (err) {
      fromBlock = this.config.mainchain.fromBlock;
    }
    if (fromBlock < this.config.mainchain.fromBlock) {
      fromBlock = this.config.mainchain.fromBlock;
    }
    return fromBlock;
  }

  async run({
    sideChainConfig,
    sideChainWeb3,
    transactionSender,
    bridgeFactory,
    federationFactory,
  }: {
    sideChainConfig: ConfigChain;
    sideChainWeb3: web3;
    transactionSender: TransactionSender;
    bridgeFactory: BridgeFactory;
    federationFactory: FederationFactory;
  }): Promise<boolean> {
    const currentBlock = await this.getMainChainWeb3().eth.getBlockNumber();
    const mainChainId = await this.getCurrentChainId();
    const sideChainId = await this.getChainId(sideChainWeb3);
    const allowTokensFactory = new AllowTokensFactory(this.config, this.logger, sideChainConfig);

    this.logger.trace(`Federator Run started currentBlock: ${currentBlock}, currentChainId: ${mainChainId}`);
    const isMainSyncing = await this.getMainChainWeb3().eth.isSyncing();
    if (isMainSyncing !== false) {
      this.logger.warn(
        `ChainId ${mainChainId} is Syncing, ${JSON.stringify(
          isMainSyncing,
        )}. Federator won't process requests till is synced`,
      );
      return false;
    }

    const isSideSyncing = await sideChainWeb3.eth.isSyncing();
    if (isSideSyncing !== false) {
      this.logger.warn(
        `ChainId ${sideChainId} is Syncing, ${JSON.stringify(
          isSideSyncing,
        )}. Federator won't process requests till is synced`,
      );
      return false;
    }

    this.logger.debug(`Current Block ${currentBlock} ChainId ${mainChainId}`);
    const allowTokens = await allowTokensFactory.getMainAllowTokensContract();
    const confirmations = await allowTokens.getConfirmations();
    const toBlock = currentBlock - confirmations.largeAmountConfirmations;
    const newToBlock = currentBlock - confirmations.smallAmountConfirmations;

    this.logger.info('Running to Block', toBlock);
    this.logger.info(`Confirmations ${confirmations}, newToBlock ${newToBlock}`);

    if (toBlock <= 0 && newToBlock <= 0) {
      return false;
    }

    let fromBlock = this.getFromBlock(mainChainId, sideChainId);
    if (fromBlock >= toBlock && fromBlock >= newToBlock) {
      this.logger.warn(
        `Current chain ${mainChainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`,
      );
      return false;
    }
    fromBlock = fromBlock + 1;
    this.logger.debug('Running from Block', fromBlock);
    await this.getLogsAndProcess({
      sideChainId,
      mainChainId,
      transactionSender,
      fromBlock,
      toBlock,
      currentBlock,
      mediumAndSmall: false,
      confirmations,
      sideChainConfig,
      federationFactory,
      allowTokensFactory,
      bridgeFactory,
    });
    const lastBlockProcessed = toBlock;

    this.logger.debug('Started the second Log and Process', newToBlock);
    await this.getLogsAndProcess({
      sideChainId,
      mainChainId,
      transactionSender,
      fromBlock: lastBlockProcessed,
      toBlock: newToBlock,
      currentBlock,
      mediumAndSmall: true,
      confirmations,
      sideChainConfig,
      federationFactory,
      allowTokensFactory,
      bridgeFactory,
    });

    return true;
  }

  async getLogsAndProcess({
    sideChainId,
    mainChainId,
    transactionSender,
    fromBlock,
    toBlock,
    currentBlock,
    mediumAndSmall,
    confirmations,
    sideChainConfig,
    federationFactory,
    allowTokensFactory,
    bridgeFactory,
  }: {
    sideChainId: number;
    mainChainId: number;
    transactionSender: TransactionSender;
    fromBlock: number;
    toBlock: number;
    currentBlock: number;
    mediumAndSmall: boolean;
    confirmations: { mediumAmountConfirmations: number; largeAmountConfirmations: number };
    sideChainConfig: ConfigChain;
    federationFactory: FederationFactory;
    allowTokensFactory: AllowTokensFactory;
    bridgeFactory: BridgeFactory;
  }) {
    this.logger.trace(
      `getLogsAndProcess started currentBlock: ${currentBlock}, fromBlock: ${fromBlock}, toBlock: ${toBlock}`,
    );
    if (fromBlock >= toBlock) {
      this.logger.debug('getLogsAndProcess fromBlock >= toBlock', fromBlock, toBlock);
      return;
    }

    const mainBridge = await bridgeFactory.getMainBridgeContract();

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
      await this._processLogs({
        sideChainId,
        mainChainId,
        transactionSender,
        logs,
        currentBlock,
        mediumAndSmall,
        confirmations,
        sideChainConfig,
        federationFactory,
        allowTokensFactory,
        bridgeFactory,
      });
      if (!mediumAndSmall) {
        this._saveProgress(this.getLastBlockPath(sideChainId, mainChainId), toPagedBlock);
      }
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async checkFederatorIsMember(sideFedContract: IFederation, federatorAddress: string) {
    const isMember = await typescriptUtils.retryNTimes(sideFedContract.isMember(federatorAddress));
    if (!isMember) {
      throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
    }
  }

  async processLog({
    sideChainId,
    mainChainId,
    transactionSender,
    log,
    confirmations,
    sideFedContract,
    allowTokens,
    currentBlock,
    federatorAddress,
    mediumAndSmall,
    sideChainConfig,
    bridgeFactory,
  }: {
    sideChainId: number;
    mainChainId: number;
    transactionSender: TransactionSender;
    log: any;
    confirmations: { largeAmountConfirmations: number; mediumAmountConfirmations: number };
    sideFedContract: IFederation;
    allowTokens: IAllowTokens;
    currentBlock: number;
    federatorAddress: string;
    mediumAndSmall: boolean;
    sideChainConfig: ConfigChain;
    allowTokensFactory: AllowTokensFactory;
    bridgeFactory: BridgeFactory;
  }): Promise<boolean> {
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
    this.logger.trace('log.returnValues', log.returnValues);

    const originChainId = Number(originChainIdStr);
    const destinationChainId = Number(destinationChainIdStr);
    const originBridge = await bridgeFactory.getMainBridgeContract();
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
    await this.processTransaction({
      sideChainId,
      mainChainId,
      transactionSender,
      log,
      sideFedContract,
      tokenAddress,
      sender: crossFrom,
      receiver,
      amount,
      symbol,
      decimals,
      granularity,
      typeId,
      txId: transactionId,
      federatorAddress,
      originChainId,
      destinationChainId,
      sideChainConfig,
    });

    return true;
  }

  async processTransaction({
    sideChainId,
    mainChainId,
    transactionSender,
    log,
    sideFedContract,
    tokenAddress,
    sender: crossFrom,
    receiver,
    amount,
    symbol,
    decimals,
    granularity,
    typeId,
    txId: transactionId,
    federatorAddress,
    originChainId,
    destinationChainId,
    sideChainConfig,
  }) {
    const wasProcessed = await typescriptUtils.retryNTimes(sideFedContract.transactionWasProcessed(transactionId));
    if (!wasProcessed) {
      const hasVoted = await sideFedContract.hasVoted(transactionId, federatorAddress);
      if (!hasVoted) {
        this.logger.info(
          `Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${tokenAddress}`,
        );
        await this._voteTransaction({
          sideChainId,
          mainChainId,
          transactionSender,
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
          sideChainConfig,
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
  }

  async _processLogs({
    sideChainId,
    mainChainId,
    transactionSender,
    logs,
    currentBlock,
    mediumAndSmall,
    confirmations,
    sideChainConfig,
    federationFactory,
    allowTokensFactory,
    bridgeFactory,
  }: {
    sideChainId: number;
    mainChainId: number;
    transactionSender: TransactionSender;
    logs: any;
    currentBlock: number;
    mediumAndSmall: boolean;
    confirmations: { mediumAmountConfirmations: number; largeAmountConfirmations: number };
    sideChainConfig: ConfigChain;
    federationFactory: FederationFactory;
    allowTokensFactory: AllowTokensFactory;
    bridgeFactory: BridgeFactory;
  }) {
    try {
      const federatorAddress = await transactionSender.getAddress(this.config.privateKey);
      const sideFedContract = await federationFactory.getSideFederationContract();
      const allowTokens = await allowTokensFactory.getMainAllowTokensContract();

      await this.checkFederatorIsMember(sideFedContract, federatorAddress);

      for (const log of logs) {
        await this.processLog({
          sideChainId,
          mainChainId,
          transactionSender,
          log,
          confirmations,
          sideFedContract,
          allowTokens,
          currentBlock,
          federatorAddress,
          mediumAndSmall,
          sideChainConfig,
          allowTokensFactory,
          bridgeFactory,
        });
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing logs`, err);
    }
  }

  async _voteTransaction({
    sideChainId,
    mainChainId,
    transactionSender,
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
    sideChainConfig,
  }: {
    sideChainId: number;
    mainChainId: number;
    transactionSender: TransactionSender;
    sideFedContract: IFederation;
    tokenAddress: string;
    sender: string;
    receiver: string;
    amount: BN;
    symbol: string;
    blockHash: string;
    transactionHash: string;
    logIndex: number;
    decimals: string;
    granularity: string;
    typeId: number;
    txId: string;
    federatorAddress: string;
    originChainId: number;
    destinationChainId: number;
    sideChainConfig: ConfigChain;
  }) {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `TransactionId ${txId} Voting Transfer ${amount} of originalTokenAddress:${tokenAddress} trough sidechain bridge ${sideChainConfig.bridge} to receiver ${receiver}`,
      );

      const txDataAbi = await sideFedContract.getVoteTransactionABI({
        originalTokenAddress: tokenAddress,
        sender,
        receiver,
        amount,
        blockHash,
        transactionHash,
        logIndex,
        tokenType: utils.tokenType.COIN,
        originChainId,
        destinationChainId,
      });

      let revertedTxns = {};

      const revertedTxnsPath = this.getRevertedTxnsPath(sideChainId, mainChainId);
      if (fs.existsSync(revertedTxnsPath)) {
        revertedTxns = JSON.parse(fs.readFileSync(revertedTxnsPath, 'utf8'));
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

      const receipt = await transactionSender.sendTransaction(
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
          revertedTxnsPath,
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

      await this.trackTransactionResultMetric(receipt.status, federatorAddress, sideFedContract);

      return true;
    } catch (err) {
      throw new CustomError(
        `Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${tokenAddress}`,
        err,
      );
    }
  }

  async trackTransactionResultMetric(wasTransactionVoted, federatorAddress, federator: IFederation) {
    this.metricCollector?.trackERC20FederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federator.getVersion(),
      await this.getCurrentChainId(),
    );
  }
}
