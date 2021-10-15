import { Logger } from 'log4js';
import { Config } from '../../config/configts';

import web3 from 'web3';
import fs from 'fs';
import TransactionSender from './TransactionSender';
import CustomError from './CustomError';
import BridgeFactory from '../contracts/BridgeFactory';
import FederationFactory from '../contracts/FederationFactory';
import utils from './utils';
import * as typescriptUtils from './typescriptUtils';
import { IFederationV3 } from '../contracts/IFederationV3';
import { RSK_TEST_NET_CHAIN_ID, ETH_KOVAN_CHAIN_ID, ETH_MAIN_NET_CHAIN_ID, RSK_MAIN_NET_CHAIN_ID } from './chainId';
import { MetricCollector } from './MetricCollector';

export class FederatorNFT {
  public logger: Logger;
  public config: Config;
  public mainWeb3: web3;
  public sideWeb3: web3;
  public sideFederationAddress: string = null;
  public transactionSender: TransactionSender;
  public bridgeFactory: BridgeFactory;
  public federationFactory: FederationFactory;
  private federatorContract: import('../contracts/IFederationV3').IFederationV3;
  private readonly metricCollector: MetricCollector;
  private chainId: number;

  constructor(config: Config, logger: Logger, metricCollector: MetricCollector) {
    this.config = config;
    this.logger = logger;
    if (!utils.checkHttpsOrLocalhost(config.mainchain.host)) {
      throw new Error(`Invalid host configuration, https or localhost required`);
    }

    this.mainWeb3 = new web3(config.mainchain.host);
    this.sideWeb3 = new web3(config.sidechain.host);

    this.transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
    this.bridgeFactory = new BridgeFactory(this.config, this.logger, web3);
    this.federationFactory = new FederationFactory(this.config, this.logger, web3);
    this.metricCollector = metricCollector;
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

  private async getCurrentChainId(): Promise<number> {
    if (this.chainId === undefined) {
      this.chainId = await this.mainWeb3.eth.net.getId();
    }
    return this.chainId;
  }

  get lastBlockPath(): string {
    return `${this.config.storagePath || __dirname}/lastBlock.txt`;
  }

  get revertedTxnsPath(): string {
    return `${this.config.storagePath || __dirname}/revertedTxns.json`;
  }

  /**
   * get federator as singleton
   * @returns Federator Interface
   */
  async getFederator(): Promise<import('../contracts/IFederationV3').IFederationV3> {
    if (this.federatorContract == null) {
      this.federatorContract = await this.federationFactory.getSideFederationNftContract();
    }
    return this.federatorContract;
  }

  async run(): Promise<boolean> {
    let retries = 3;
    const sleepAfterRetrie = 10_000;
    while (retries > 0) {
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
        const toBlock = currentBlock - (await this.getNftConfirmationsForCurrentChainId());

        this.logger.info('Running to Block', toBlock);

        if (toBlock <= 0) {
          return false;
        }

        if (!fs.existsSync(this.config.storagePath)) {
          await fs.mkdirSync(this.config.storagePath, {
            recursive: true,
          });
        }

        let fromBlock = this.getLastBlock();
        if (fromBlock >= toBlock) {
          this.logger.warn(
            `Current chain ${chainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`,
          );
          return false;
        }
        fromBlock = fromBlock + 1;
        this.logger.debug('Running from Block', fromBlock);
        await this.getLogsAndProcess(fromBlock, toBlock, currentBlock);
        return true;
      } catch (err) {
        this.logger.error(new Error('Exception Running Federator'), err);
        retries--;
        this.logger.debug(`Runned ${3 - retries} retrie`);
        if (retries > 0) {
          await utils.sleep(sleepAfterRetrie);
        } else {
          process.exit(1);
        }
      }
    }
  }

  getLastBlock(): number {
    let fromBlock: number = null;
    const originalFromBlock = this.config.mainchain.fromBlock || 0;
    try {
      fromBlock = parseInt(fs.readFileSync(this.lastBlockPath, 'utf8'));
    } catch (err) {
      fromBlock = originalFromBlock;
    }
    if (fromBlock < originalFromBlock) {
      fromBlock = originalFromBlock;
    }
    return fromBlock;
  }

  async getLogsAndProcess(fromBlock: number, toBlock: number, currentBlock: number): Promise<void> {
    if (fromBlock >= toBlock) return;

    const mainBridge = await this.bridgeFactory.getMainNftBridgeContract();

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
      await this._processLogs(logs, currentBlock);
      this._saveProgress(this.lastBlockPath, toPagedBlock.toString());
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async _processLogs(logs: any, currentBlock: number): Promise<boolean> {
    try {
      const federatorAddress = await this.transactionSender.getAddress(this.config.privateKey);
      const fedContract: IFederationV3 = await this.getFederator();
      const isMember: boolean = await typescriptUtils.retryNTimes(fedContract.isMember(federatorAddress));
      if (!isMember) {
        throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
      }

      for (const log of logs) {
        this.logger.info('Processing event log:', log);

        const { blockHash, transactionHash, logIndex, blockNumber } = log;

        const { _to: receiver, _from: sender, _tokenId: tokenId } = log.returnValues;

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
          fedContract.getTransactionId({
            originalTokenAddress: originalTokenAddress,
            sender,
            receiver,
            amount: tokenId,
            blockHash,
            transactionHash,
            logIndex,
          }),
        );
        this.logger.info('get transaction id:', transactionId);

        const wasProcessed: boolean = await typescriptUtils.retryNTimes(
          fedContract.transactionWasProcessed(transactionId),
        );
        if (wasProcessed) {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${originalTokenAddress} was already processed`,
          );
          continue;
        }

        const hasVoted: boolean = await fedContract.hasVoted(transactionId, federatorAddress);
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
        await this._voteTransaction(
          originalTokenAddress,
          sender,
          receiver,
          tokenId,
          log.blockHash,
          log.transactionHash,
          log.logIndex,
          transactionId,
          federatorAddress,
        );
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing logs`, err);
    }
  }

  async _voteTransaction(
    originalTokenAddress: string,
    sender: string,
    receiver: string,
    tokenId: number,
    blockHash: string,
    transactionHash: string,
    logIndex: number,
    txId: string,
    federatorAddress: string,
  ): Promise<boolean> {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `Voting Transfer of token ${tokenId} of originalTokenAddress:${originalTokenAddress} through sidechain bridge ${this.config.sidechain.bridge} to receiver ${receiver}`,
      );

      const fedContract = await this.getFederator();
      const voteTransactionTxData = await fedContract.getVoteTransactionABI({
        originalTokenAddress,
        sender,
        receiver,
        amount: tokenId,
        blockHash,
        transactionHash,
        logIndex,
        tokenType: utils.tokenType.NFT,
      });

      this.logger.debug(
        `_voteTransaction, handleRevertedTxns originalTokenAddress ${originalTokenAddress}`,
        voteTransactionTxData,
      );
      return await this.handleRevertedTxns(
        originalTokenAddress,
        sender,
        receiver,
        tokenId,
        blockHash,
        transactionHash,
        logIndex,
        txId,
        fedContract.getAddress(),
        voteTransactionTxData,
        federatorAddress,
      );
    } catch (err) {
      throw new CustomError(
        `Exception Voting tx:${transactionHash} block: ${blockHash} originalTokenAddress: ${originalTokenAddress}`,
        err,
      );
    }
  }

  async handleRevertedTxns(
    originalTokenAddress: string,
    sender: string,
    receiver: string,
    tokenId: number,
    blockHash: string,
    transactionHash: string,
    logIndex: number,
    txId: string,
    federationContractAddress: string,
    voteTransactionTxData: any,
    federatorAddress: string,
  ): Promise<boolean> {
    let revertedTxns = {};
    if (fs.existsSync(this.revertedTxnsPath)) {
      revertedTxns = JSON.parse(fs.readFileSync(this.revertedTxnsPath, 'utf8'));
      this.logger.info(`read these transactions from reverted transactions file`, revertedTxns);
    }

    if (revertedTxns[txId]) {
      this.logger.info(
        `Skipping Voting ${tokenId} of originalTokenAddress:${originalTokenAddress} TransactionId ${txId} since it's marked as reverted.`,
        revertedTxns[txId],
      );
      return false;
    }

    const receipt = await this.transactionSender.sendTransaction(
      federationContractAddress,
      voteTransactionTxData,
      0,
      this.config.privateKey,
    );

    if (receipt.status == false) {
      this.writeRevertedTxns(
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
    await this.trackTransactionResultMetric(receipt.status, federatorAddress);
    return receipt.status;
  }

  writeRevertedTxns(content: string): void {
    fs.writeFileSync(this.revertedTxnsPath, content);
  }

  _saveProgress(path: fs.PathOrFileDescriptor, value: string): void {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }

  private async trackTransactionResultMetric(wasTransactionVoted, federatorAddress) {
    const federator = await this.getFederator();
    this.metricCollector?.trackERC721FederatorVotingResult(
      wasTransactionVoted,
      federatorAddress,
      federator.getVersion(),
      await this.getCurrentChainId(),
    );
  }
}
