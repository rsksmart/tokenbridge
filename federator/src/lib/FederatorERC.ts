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

export interface BaseLogsParams {
  sideChainId: number;
  mainChainId: number;
  transactionSender: TransactionSender;
  currentBlock: number;
  mediumAndSmall: boolean;
  confirmations: { mediumAmountConfirmations: number; largeAmountConfirmations: number };
  sideChainConfig: ConfigChain;
  federationFactory: FederationFactory;
  allowTokensFactory: AllowTokensFactory;
  bridgeFactory: BridgeFactory;
}

export interface GetLogsParams extends BaseLogsParams {
  fromBlock: number;
  toBlock: number;
}

export interface ProcessLogsParams extends BaseLogsParams {
  logs: any[];
}

export interface ProcessLogParams extends BaseLogsParams {
  log: any;
  sideFedContract: IFederation;
  allowTokens: IAllowTokens;
  federatorAddress: string;
}

export interface ProcessTransactionParams extends ProcessLogParams {
  tokenAddress: string;
  senderAddress: string;
  receiver: string;
  amount: BN;
  symbol: string;
  decimals: string;
  granularity: string;
  typeId: string;
  transactionId: string;
  originChainId: number;
  destinationChainId: number;
}
export interface VoteTransactionParams extends ProcessTransactionParams {
  blockHash: string;
  transactionHash: string;
  logIndex: number;
}

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

  async getLogsAndProcess(getLogParams: GetLogsParams) {
    this.logger.trace(
      `getLogsAndProcess started currentBlock: ${getLogParams.currentBlock}, fromBlock: ${getLogParams.fromBlock}, toBlock: ${getLogParams.toBlock}`,
    );
    if (getLogParams.fromBlock >= getLogParams.toBlock) {
      this.logger.debug('getLogsAndProcess fromBlock >= toBlock', getLogParams.fromBlock, getLogParams.toBlock);
      return;
    }

    const mainBridge = await getLogParams.bridgeFactory.getMainBridgeContract();

    const recordsPerPage = 1000;
    const numberOfPages = Math.ceil((getLogParams.toBlock - getLogParams.fromBlock) / recordsPerPage);
    this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

    let fromPageBlock = getLogParams.fromBlock;
    for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
      let toPagedBlock = fromPageBlock + recordsPerPage - 1;
      if (currentPage === numberOfPages) {
        toPagedBlock = getLogParams.toBlock;
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
        ...getLogParams,
        logs,
      });
      if (!getLogParams.mediumAndSmall) {
        this._saveProgress(this.getLastBlockPath(getLogParams.sideChainId, getLogParams.mainChainId), toPagedBlock);
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

  async processLog(processLogParams: ProcessLogParams): Promise<boolean> {
    this.logger.info('Processing event log:', processLogParams.log);

    const { blockHash, transactionHash, logIndex, blockNumber } = processLogParams.log;

    const {
      _to: receiver,
      _from: crossFromAddress,
      _amount: amount,
      _symbol: symbol,
      _tokenAddress: tokenAddress,
      _decimals: decimals,
      _granularity: granularity,
      _typeId: typeId,
      originChainId: originChainIdStr,
      destinationChainId: destinationChainIdStr,
    } = processLogParams.log.returnValues;
    this.logger.trace('log.returnValues', processLogParams.log.returnValues);

    const originChainId = Number(originChainIdStr);
    const destinationChainId = Number(destinationChainIdStr);
    const originBridge = await processLogParams.bridgeFactory.getMainBridgeContract();
    const sideTokenAddress = await utils.retry3Times(
      originBridge.getMappedToken({
        originalTokenAddress: tokenAddress,
        chainId: destinationChainIdStr,
      }).call,
    );

    let allowed: number, mediumAmount: number, largeAmount: number;
    if (sideTokenAddress === utils.zeroAddress) {
      ({ allowed, mediumAmount, largeAmount } = await processLogParams.allowTokens.getLimits({
        tokenAddress: tokenAddress,
      }));
      if (!allowed) {
        throw new Error(
          `Original Token not allowed nor side token Tx:${transactionHash} originalTokenAddress:${tokenAddress}
            Bridge Contract Addr ${originBridge}`,
        );
      }
    } else {
      ({ allowed, mediumAmount, largeAmount } = await processLogParams.allowTokens.getLimits({
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

    if (processLogParams.mediumAndSmall) {
      // At this point we're processing blocks newer than largeAmountConfirmations
      // and older than smallAmountConfirmations
      if (amountBN.gte(largeAmountBN)) {
        const c = processLogParams.currentBlock - blockNumber;
        const rC = processLogParams.confirmations.largeAmountConfirmations;
        this.logger.debug(
          `[large amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`,
        );
        return false;
      }

      if (
        amountBN.gte(mediumAmountBN) &&
        processLogParams.currentBlock - blockNumber < processLogParams.confirmations.mediumAmountConfirmations
      ) {
        const c = processLogParams.currentBlock - blockNumber;
        const rC = processLogParams.confirmations.mediumAmountConfirmations;
        this.logger.debug(
          `[medium amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${c} < ${rC}`,
        );
        return false;
      }
    }

    const transactionId = await typescriptUtils.retryNTimes(
      processLogParams.sideFedContract.getTransactionId({
        originalTokenAddress: tokenAddress,
        sender: crossFromAddress,
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
      ...processLogParams,
      tokenAddress,
      senderAddress: crossFromAddress,
      receiver,
      amount,
      symbol,
      decimals,
      granularity,
      typeId,
      transactionId,
      originChainId,
      destinationChainId,
    });

    return true;
  }

  async processTransaction(processTransactionParams: ProcessTransactionParams) {
    const wasProcessed = await typescriptUtils.retryNTimes(
      processTransactionParams.sideFedContract.transactionWasProcessed(processTransactionParams.transactionId),
    );
    if (!wasProcessed) {
      const hasVoted = await processTransactionParams.sideFedContract.hasVoted(
        processTransactionParams.transactionId,
        processTransactionParams.federatorAddress,
      );
      if (!hasVoted) {
        this.logger.info(
          `Voting tx: ${processTransactionParams.log.transactionHash} block: ${processTransactionParams.log.blockHash}
          originalTokenAddress: ${processTransactionParams.tokenAddress}`,
        );
        await this._voteTransaction({
          ...processTransactionParams,
          blockHash: processTransactionParams.log.blockHash,
          transactionHash: processTransactionParams.log.transactionHash,
          logIndex: processTransactionParams.log.logIndex,
        });
      } else {
        this.logger.debug(
          `Block: ${processTransactionParams.log.blockHash} Tx: ${processTransactionParams.log.transactionHash}
          originalTokenAddress: ${processTransactionParams.tokenAddress}  has already been voted by us`,
        );
      }
    } else {
      this.logger.debug(
        `Block: ${processTransactionParams.log.blockHash} Tx: ${processTransactionParams.log.transactionHash}
        originalTokenAddress: ${processTransactionParams.tokenAddress} was already processed`,
      );
    }
  }

  async _processLogs(processLogsParams: ProcessLogsParams) {
    try {
      const federatorAddress = await processLogsParams.transactionSender.getAddress(this.config.privateKey);
      const sideFedContract = await processLogsParams.federationFactory.getSideFederationContract();
      const allowTokens = await processLogsParams.allowTokensFactory.getMainAllowTokensContract();

      await this.checkFederatorIsMember(sideFedContract, federatorAddress);

      for (const log of processLogsParams.logs) {
        await this.processLog({
          ...processLogsParams,
          log,
          sideFedContract,
          allowTokens,
          federatorAddress,
        });
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing logs`, err);
    }
  }

  async _voteTransaction(voteTransactionParams: VoteTransactionParams) {
    try {
      voteTransactionParams.transactionId = voteTransactionParams.transactionId.toLowerCase();
      this.logger.info(
        `TransactionId ${voteTransactionParams.transactionId} Voting Transfer ${voteTransactionParams.amount}
        of originalTokenAddress:${voteTransactionParams.tokenAddress} trough sidechain bridge ${voteTransactionParams.sideChainConfig.bridge} to receiver ${voteTransactionParams.receiver}`,
      );

      const txDataAbi = await voteTransactionParams.sideFedContract.getVoteTransactionABI({
        originalTokenAddress: voteTransactionParams.tokenAddress,
        sender: voteTransactionParams.senderAddress,
        receiver: voteTransactionParams.receiver,
        amount: voteTransactionParams.amount,
        blockHash: voteTransactionParams.blockHash,
        transactionHash: voteTransactionParams.transactionHash,
        logIndex: voteTransactionParams.logIndex,
        tokenType: utils.tokenType.COIN,
        originChainId: voteTransactionParams.originChainId,
        destinationChainId: voteTransactionParams.destinationChainId,
      });

      let revertedTxns = {};

      const revertedTxnsPath = this.getRevertedTxnsPath(
        voteTransactionParams.sideChainId,
        voteTransactionParams.mainChainId,
      );
      if (fs.existsSync(revertedTxnsPath)) {
        revertedTxns = JSON.parse(fs.readFileSync(revertedTxnsPath, 'utf8'));
        this.logger.info(`read these transactions from reverted transactions file`, revertedTxns);
      }

      if (revertedTxns[voteTransactionParams.transactionId]) {
        this.logger.info(
          `Skipping Voting ${voteTransactionParams.amount} of originalTokenAddress:${voteTransactionParams.tokenAddress}
          TransactionId ${voteTransactionParams.transactionId} since it's marked as reverted.`,
          revertedTxns[voteTransactionParams.transactionId],
        );
        return false;
      }

      this.logger.info(
        `Voting ${voteTransactionParams.amount} of originalTokenAddress:${voteTransactionParams.tokenAddress}
        TransactionId ${voteTransactionParams.transactionId} was not reverted.`,
      );

      const receipt = await voteTransactionParams.transactionSender.sendTransaction(
        voteTransactionParams.sideFedContract.getAddress(),
        txDataAbi,
        0,
        this.config.privateKey,
      );

      if (!receipt.status) {
        this.logger.info(
          `Voting ${voteTransactionParams.amount} of originalTokenAddress:${voteTransactionParams.tokenAddress}
          TransactionId ${voteTransactionParams.transactionId} failed, check the receipt`,
          receipt,
        );

        fs.writeFileSync(
          revertedTxnsPath,
          JSON.stringify({
            ...revertedTxns,
            [voteTransactionParams.transactionId]: {
              originalTokenAddress: voteTransactionParams.tokenAddress,
              sender: voteTransactionParams.senderAddress,
              receiver: voteTransactionParams.receiver,
              amount: voteTransactionParams.amount,
              symbol: voteTransactionParams.symbol,
              blockHash: voteTransactionParams.blockHash,
              transactionHash: voteTransactionParams.transactionHash,
              logIndex: voteTransactionParams.logIndex,
              decimals: voteTransactionParams.decimals,
              granularity: voteTransactionParams.granularity,
            },
          }),
        );
      }

      await this.trackTransactionResultMetric(
        receipt.status,
        voteTransactionParams.federatorAddress,
        voteTransactionParams.sideFedContract,
      );

      return true;
    } catch (err) {
      throw new CustomError(
        `Exception Voting tx:${voteTransactionParams.transactionHash} block: ${voteTransactionParams.blockHash} originalTokenAddress: ${voteTransactionParams.tokenAddress}`,
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
