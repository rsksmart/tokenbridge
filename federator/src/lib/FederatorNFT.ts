import { Logger } from 'log4js';

import web3 from 'web3';
import fs from 'fs';
import TransactionSender from './TransactionSender';
import CustomError from './CustomError';
import { BridgeFactory } from '../contracts/BridgeFactory';
import { FederationFactory } from '../contracts/FederationFactory';
import utils from './utils';
import * as typescriptUtils from './typescriptUtils';
import { RSK_TEST_NET_CHAIN_ID, ETH_KOVAN_CHAIN_ID, ETH_MAIN_NET_CHAIN_ID, RSK_MAIN_NET_CHAIN_ID } from './chainId';
import { MetricCollector } from './MetricCollector';
import { IFederationV3 } from '../contracts/IFederationV3';
import { BN } from 'ethereumjs-util';
import { ConfigChain } from './configChain';
import Federator from './Federator';
import { Config } from './config';

export default class FederatorNFT extends Federator {
  constructor(config: Config, logger: Logger, metricCollector: MetricCollector) {
    super(config, logger, metricCollector);
  }

  private async getNftConfirmationsForCurrentChainId(): Promise<number> {
    const chainId = await this.getCurrentChainId();
    let confirmations = 0;
    if (chainId == RSK_TEST_NET_CHAIN_ID) {
      confirmations = 2;
    }
    if (chainId == ETH_KOVAN_CHAIN_ID) {
      confirmations = 10;
    }
    if (chainId == ETH_MAIN_NET_CHAIN_ID) {
      confirmations = 240;
    }
    if (chainId == RSK_MAIN_NET_CHAIN_ID) {
      confirmations = 120;
    }
    // TODO: remove nftConfirmations from config everywhere.
    return confirmations;
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
      const sideChainId = await sideChainWeb3.eth.net.getId();
      this.logger.warn(
        `ChainId ${sideChainId} is Syncing, ${JSON.stringify(
          isSideSyncing,
        )}. Federator won't process requests till is synced`,
      );
      return false;
    }

    this.logger.debug(`Current Block ${currentBlock} ChainId ${mainChainId}`);
    const toBlock = currentBlock - (await this.getNftConfirmationsForCurrentChainId());

    this.logger.info('Running to Block', toBlock);

    if (toBlock <= 0) {
      return false;
    }

    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, {
        recursive: true,
      });
    }

    let fromBlock = this.getLastBlock(sideChainId, mainChainId);
    if (fromBlock >= toBlock) {
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
      fromBlock,
      toBlock,
      currentBlock,
      transactionSender,
      bridgeFactory,
      federationFactory,
      sideChainConfig,
    });
    return true;
  }

  getLastBlock(sideChainId: number, mainChainId: number): number {
    let fromBlock: number = null;
    const originalFromBlock = this.config.mainchain.fromBlock || 0;
    try {
      fromBlock = parseInt(fs.readFileSync(this.getLastBlockPath(sideChainId, mainChainId), 'utf8'));
    } catch (err) {
      fromBlock = originalFromBlock;
    }
    if (fromBlock < originalFromBlock) {
      fromBlock = originalFromBlock;
    }
    return fromBlock;
  }

  async getLogsAndProcess({
    sideChainId,
    mainChainId,
    fromBlock,
    toBlock,
    currentBlock,
    transactionSender,
    bridgeFactory,
    federationFactory,
    sideChainConfig,
  }: {
    sideChainId: number;
    mainChainId: number;
    fromBlock: number;
    toBlock: number;
    currentBlock: number;
    transactionSender: TransactionSender;
    bridgeFactory: BridgeFactory;
    federationFactory: FederationFactory;
    sideChainConfig: ConfigChain;
  }): Promise<void> {
    if (fromBlock >= toBlock) {
      return;
    }

    const mainBridge = bridgeFactory.getMainNftBridgeContract();
    const recordsPerPage = 1000;
    const numberOfPages = Math.ceil((toBlock - fromBlock) / recordsPerPage);
    this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

    let fromPageBlock = fromBlock;
    for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
      let toPagedBlock = fromPageBlock + recordsPerPage - 1;
      if (currentPage == numberOfPages) {
        toPagedBlock = toBlock;
      }
      this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
      const logs = await mainBridge.getPastEvents('Cross', {
        fromBlock: fromPageBlock,
        toBlock: toPagedBlock,
      });
      if (!logs) throw new Error('Failed to obtain the logs');

      this.logger.info(`Found ${logs.length} logs`);
      await this._processLogs({ sideChainId, mainChainId, logs, currentBlock, transactionSender, federationFactory, sideChainConfig });
      this._saveProgress(this.getLastBlockPath(sideChainId, mainChainId), toPagedBlock.toString());
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async _processLogs({
    sideChainId,
    mainChainId,
    logs,
    currentBlock,
    transactionSender,
    federationFactory,
    sideChainConfig,
  }: {
    sideChainId: number;
    mainChainId: number;
    logs: any;
    currentBlock: number;
    transactionSender: TransactionSender;
    federationFactory: FederationFactory;
    sideChainConfig: ConfigChain;
  }): Promise<boolean> {
    try {
      const federatorAddress = await transactionSender.getAddress(this.config.privateKey);
      const federatorContract = await federationFactory.getSideFederationNftContract();
      const isMember: boolean = await typescriptUtils.retryNTimes(federatorContract.isMember(federatorAddress));
      if (!isMember) {
        throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
      }

      for (const log of logs) {
        this.logger.info('Processing event log:', log);

        const { blockHash, transactionHash, logIndex, blockNumber } = log;

        const {
          _to: receiver,
          _from: sender,
          _tokenId: tokenIdStr,
          _originChainId: originChainIdStr,
          _destinationChainId: destinationChainIdStr,
        } = log.returnValues;

        const originChainId = Number(originChainIdStr);
        const destinationChainId = Number(destinationChainIdStr);
        const tokenId = new BN(tokenIdStr);

        const originalTokenAddress = log.returnValues._originalTokenAddress.toLowerCase();
        const blocksConfirmed = currentBlock - blockNumber;
        const nftConfirmationsForCurrentChainId = await this.getNftConfirmationsForCurrentChainId();
        if (blocksConfirmed < nftConfirmationsForCurrentChainId) {
          this.logger.debug(
            `[NFT] Tx: originalTokenAddress:${originalTokenAddress} won't be proccessed yet ${blocksConfirmed} < ${nftConfirmationsForCurrentChainId}`,
          );
          continue;
        }

        const transactionId = await typescriptUtils.retryNTimes(
          federatorContract.getTransactionId({
            originalTokenAddress,
            sender,
            receiver,
            amount: tokenId,
            blockHash,
            transactionHash,
            logIndex,
            originChainId,
            destinationChainId,
          }),
        );
        this.logger.info('get transaction id:', transactionId);

        const wasProcessed: boolean = await typescriptUtils.retryNTimes(
          federatorContract.transactionWasProcessed(transactionId),
        );
        if (wasProcessed) {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${originalTokenAddress} was already processed`,
          );
          continue;
        }

        const hasVoted: boolean = await federatorContract.hasVoted(transactionId, federatorAddress);
        if (hasVoted) {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${originalTokenAddress}  has already been voted by us`,
          );
          continue;
        }

        this.logger.info(
          `Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${originalTokenAddress}`,
        );

        this.logger.debug(`_voteTransaction sending - originalTokenAddress: ${originalTokenAddress}`);
        await this._voteTransaction({
          sideChainId,
          mainChainId,
          originalTokenAddress,
          sender,
          receiver,
          tokenId,
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          txId: transactionId,
          federatorAddress,
          originChainId,
          destinationChainId,
          federationFactory,
          transactionSender,
          federatorContract,
          sideChainConfig,
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
    originalTokenAddress,
    sender,
    receiver,
    tokenId,
    blockHash,
    transactionHash,
    logIndex,
    txId,
    federatorAddress,
    originChainId,
    destinationChainId,
    federationFactory,
    transactionSender,
    federatorContract,
    sideChainConfig,
  }: {
    sideChainId: number;
    mainChainId: number;
    originalTokenAddress: string;
    sender: string;
    receiver: string;
    tokenId: BN;
    blockHash: string;
    transactionHash: string;
    logIndex: number;
    txId: string;
    federatorAddress: string;
    originChainId: number;
    destinationChainId: number;
    federationFactory: FederationFactory;
    transactionSender: TransactionSender;
    federatorContract: IFederationV3;
    sideChainConfig: ConfigChain;
  }): Promise<boolean> {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `Voting Transfer of token ${tokenId} of originalTokenAddress:${originalTokenAddress} through sidechain bridge ${sideChainConfig.bridge} to receiver ${receiver}`,
      );

      const voteTransactionTxData = await federatorContract.getVoteTransactionABI({
        originalTokenAddress,
        sender,
        receiver,
        amount: tokenId,
        blockHash,
        transactionHash,
        logIndex,
        tokenType: utils.tokenType.NFT,
        originChainId,
        destinationChainId,
      });

      this.logger.debug(
        `_voteTransaction, handleRevertedTxns originalTokenAddress ${originalTokenAddress}`,
        voteTransactionTxData,
      );
      return await this.handleRevertedTxns({
        sideChainId,
        mainChainId,
        originalTokenAddress,
        sender,
        receiver,
        tokenId,
        blockHash,
        transactionHash,
        logIndex,
        txId,
        federationContractAddress: federatorContract.getAddress(),
        voteTransactionTxData,
        federatorAddress,
        transactionSender,
        federatorContract,
      });
    } catch (err) {
      const msgError = `Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${originalTokenAddress}`;
      this.logger.error(msgError, err);
      throw new CustomError(msgError, err);
    }
  }

  async handleRevertedTxns({
    sideChainId,
    mainChainId,
    originalTokenAddress,
    sender,
    receiver,
    tokenId,
    blockHash,
    transactionHash,
    logIndex,
    txId,
    federationContractAddress,
    voteTransactionTxData,
    federatorAddress,
    transactionSender,
    federatorContract,
  }: {
    sideChainId: number;
    mainChainId: number;
    originalTokenAddress: string;
    sender: string;
    receiver: string;
    tokenId: BN;
    blockHash: string;
    transactionHash: string;
    logIndex: number;
    txId: string;
    federationContractAddress: string;
    voteTransactionTxData: any;
    federatorAddress: string;
    transactionSender: TransactionSender;
    federatorContract: IFederationV3;
  }): Promise<boolean> {
    const revertedTxnsPath = this.getRevertedTxnsPath(sideChainId, mainChainId);
    let revertedTxns = {};
    if (fs.existsSync(revertedTxnsPath)) {
      revertedTxns = JSON.parse(fs.readFileSync(revertedTxnsPath, 'utf8'));
      this.logger.info(`read these transactions from reverted transactions file`, revertedTxns);
    }

    if (revertedTxns[txId]) {
      this.logger.info(
        `Skipping Voting ${tokenId} of originalTokenAddress:${originalTokenAddress} TransactionId ${txId} since it's marked as reverted.`,
        revertedTxns[txId],
      );
      return false;
    }

    const receipt = await transactionSender.sendTransaction(
      federationContractAddress,
      voteTransactionTxData,
      0,
      this.config.privateKey,
    );

    if (receipt.status == false) {
      this.writeRevertedTxns(
        revertedTxnsPath,
        JSON.stringify({
          ...revertedTxns,
          [txId]: {
            originalTokenAddress,
            sender,
            receiver,
            tokenId,
            blockHash,
            transactionHash,
            logIndex,
          },
        }),
      );
    }
    await this.trackTransactionResultMetric(receipt.status, federatorAddress, federatorContract);
    return receipt.status;
  }

  writeRevertedTxns(revertedTxnsPath: string, content: string): void {
    fs.writeFileSync(revertedTxnsPath, content);
  }

  _saveProgress(path: fs.PathOrFileDescriptor, value: string): void {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }

  private async trackTransactionResultMetric(wasTransactionVoted, federatorAddress, federator: IFederationV3) {
    this.metricCollector?.trackERC721FederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federator.getVersion(),
      await this.getCurrentChainId(),
    );
  }
}
