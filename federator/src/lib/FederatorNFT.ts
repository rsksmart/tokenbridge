import { Logger } from 'log4js';
import { Config } from '../../config/configts';
import Web3 from 'web3';

import web3 from 'web3';
import fs from 'fs';
import TransactionSender from './TransactionSender';
import CustomError from './CustomError';
import BridgeFactory from '../contracts/BridgeFactory';
import FederationFactory from '../contracts/FederationFactory';
import utils from './utils';

const NFT_CONFIRMATION_BLOCKS = 5;
export class FederatorNFT {
  public logger: Logger;
  public config: Config;
  public mainWeb3: Web3;
  public sideWeb3: Web3;
  public sideFederationAddress: string = null;
  public transactionSender: TransactionSender;
  public bridgeFactory: BridgeFactory;
  public federationFactory: FederationFactory;
  public nftConfirmationsBlocks: number;
  private federatorContract: import('../contracts/IFederationV3').IFederationV3;

  constructor(config: Config, logger: Logger, Web3 = web3) {
    this.config = config;
    this.logger = logger;
    this.nftConfirmationsBlocks = config.nftConfirmations ?? NFT_CONFIRMATION_BLOCKS;
    if (!utils.checkHttpsOrLocalhost(config.mainchain.host)) {
      throw new Error(`Invalid host configuration, https or localhost required`);
    }

    this.mainWeb3 = new Web3(config.mainchain.host);
    this.sideWeb3 = new Web3(config.sidechain.host);

    this.transactionSender = new TransactionSender(this.sideWeb3, this.logger, this.config);
    this.bridgeFactory = new BridgeFactory(this.config, this.logger, Web3);
    this.federationFactory = new FederationFactory(this.config, this.logger, Web3);
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
        const chainId = await this.mainWeb3.eth.net.getId();

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
        const toBlock = currentBlock - this.nftConfirmationsBlocks;

        this.logger.info('Running to Block', toBlock);

        if (toBlock <= 0) {
          return false;
        }

        if (!fs.existsSync(this.config.storagePath)) {
          fs.mkdirSync(this.config.storagePath);
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
        this.logger.debug(`Run ${3 - retries} retrie`);
        if (retries > 0) {
          await utils.sleep(sleepAfterRetrie);
        } else {
          process.exit();
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

    const mainBridge = await this.bridgeFactory.getMainBridgeContract();

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
      const from = await this.transactionSender.getAddress(this.config.privateKey);
      const fedContract = await this.getFederator();

      const isMember = await utils.retry3Times(fedContract.isMember(from));
      if (!isMember) throw new Error(`This Federator addr:${from} is not part of the federation`);

      for (const log of logs) {
        this.logger.info('Processing event log:', log);

        const { blockHash, transactionHash, logIndex, blockNumber } = log;

        const {
          _to: receiver,
          _from: sender,
          _tokenId: tokenId,
          _originalTokenAddress: originalTokenAddress,
        } = log.returnValues;

        const mainBridge = await this.bridgeFactory.getMainBridgeContract();
        const sideTokenAddress = await utils.retry3Times(mainBridge.getMappedToken(originalTokenAddress).call);
        if (sideTokenAddress == utils.zeroAddress) {
          throw new Error(
            `Side token is zero Address Tx:${transactionHash} originalTokenAddress:${originalTokenAddress}`,
          );
        }

        const blocksConfirmed = currentBlock - blockNumber;
        if (blocksConfirmed < this.nftConfirmationsBlocks) {
          this.logger.debug(
            `[NFT] Tx: originalTokenAddress:${originalTokenAddress} won't be proccessed yet ${blocksConfirmed} < ${this.nftConfirmationsBlocks}`,
          );
          continue;
        }

        const transactionId = await utils.retry3Times(
          fedContract.getTransactionId({
            originalTokenAddress,
            sender,
            receiver,
            amount: tokenId,
            blockHash,
            transactionHash,
            logIndex,
          }),
        );
        this.logger.info('get transaction id:', transactionId);

        const wasProcessed = await utils.retry3Times(fedContract.transactionWasProcessed(transactionId));
        if (wasProcessed) {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${originalTokenAddress} was already processed`,
          );
          continue;
        }

        const hasVoted = await fedContract.hasVoted(transactionId, from);
        if (!hasVoted) {
          this.logger.debug(
            `Block: ${log.blockHash} Tx: ${log.transactionHash} originalTokenAddress: ${originalTokenAddress}  has already been voted by us`,
          );
          continue;
        }

        this.logger.info(
          `Voting tx: ${log.transactionHash} block: ${log.blockHash} originalTokenAddress: ${originalTokenAddress}`,
        );

        await this._voteTransaction(
          originalTokenAddress,
          sender,
          receiver,
          tokenId,
          log.blockHash,
          log.transactionHash,
          log.logIndex,
          transactionId,
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
  ): Promise<boolean> {
    try {
      txId = txId.toLowerCase();
      this.logger.info(
        `Voting Transfer ${tokenId} of originalTokenAddress:${originalTokenAddress} trough sidechain bridge ${this.config.sidechain.bridge} to receiver ${receiver}`,
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
}
