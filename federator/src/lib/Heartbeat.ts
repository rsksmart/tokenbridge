import Web3 from 'web3';
import { Config } from './config';

import fs from 'fs';
import TransactionSender from './TransactionSender';
import { CustomError } from './CustomError';
import { FederationFactory } from '../contracts/FederationFactory';
import * as utils from '../lib/utils';
import { IFederation } from '../contracts/IFederation';
import { LogWrapper } from './logWrapper';
import { MetricCollector } from './MetricCollector';
import * as typescriptUtils from './typescriptUtils';

const currentVersion = process.env.npm_package_version;

export class Heartbeat {
  config: Config;
  logger: LogWrapper;
  mainWeb3: Web3;
  sideChains: any[];
  transactionSender: any;
  lastBlockPath: string;
  federationFactory: FederationFactory;
  metricCollector: MetricCollector;

  constructor(config: Config, logger: LogWrapper, metricCollector: MetricCollector) {
    this.config = config;
    this.logger = logger;
    if (this.logger.upsertContext) {
      this.logger.upsertContext('service', this.constructor.name);
    }
    this.mainWeb3 = new Web3(config.mainchain.host);

    this.metricCollector = metricCollector;
    this.federationFactory = new FederationFactory();
    this.transactionSender = new TransactionSender(this.mainWeb3, this.logger, this.config);
    this.lastBlockPath = `${config.storagePath || __dirname}/heartBeatLastBlock.txt`;
    this.sideChains = [];
    for (const sideChainConfig of config.sidechain) {
      this.sideChains.push({
        web3: new Web3(sideChainConfig.host),
        chainId: sideChainConfig.chainId,
        name: sideChainConfig.name,
      });
    }
  }

  async run(): Promise<boolean> {
    await this._checkIfRsk();
    const retryCounter = new typescriptUtils.RetryCounter({ log: this.logger });
    const sleepAfterRetryMs = 3000;
    while (retryCounter.hasAttempts()) {
      try {
        const fedChainsId = [];
        const fedChainsBlocks = [];
        const fedChainInfo = [];

        fedChainsId.push(this.config.mainchain.chainId);
        fedChainsBlocks.push(await typescriptUtils.retryNTimes(this.mainWeb3.eth.getBlockNumber()));
        fedChainInfo.push(await typescriptUtils.retryNTimes(this.mainWeb3.eth.getNodeInfo()));

        for (const sideChain of this.sideChains) {
          fedChainsId.push(sideChain.chainId);
          fedChainsBlocks.push(await typescriptUtils.retryNTimes(sideChain.web3.eth.getBlockNumber()));
          fedChainInfo.push(await typescriptUtils.retryNTimes(sideChain.web3.eth.getNodeInfo()));
        }

        return await this._emitHeartbeat(currentVersion, fedChainsId, fedChainsBlocks, fedChainInfo);
      } catch (err) {
        this.logger.error(new Error('Exception Running Heartbeat'), err);
        retryCounter.useAttempt();
        this.logger.debug(`Run ${retryCounter.initialAttempts - retryCounter.attemptsLeft()} retry`);
        if (retryCounter.hasAttempts()) {
          await utils.sleep(sleepAfterRetryMs);
        } else {
          process.exit(1);
        }
      }
    }
    return false;
  }

  checkStoragePath() {
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, {
        recursive: true,
      });
    }
  }

  getFromBlock(): number {
    const originalFromBlock = this.config.mainchain.fromBlock;
    let fromBlock = null;
    try {
      fromBlock = fs.readFileSync(this.lastBlockPath, 'utf8');
    } catch (err) {
      fromBlock = originalFromBlock;
    }

    if (fromBlock < originalFromBlock) {
      return originalFromBlock;
    }
    return parseInt(fromBlock);
  }

  async handleReadLogsPage(
    numberOfPages: number,
    fromPageBlock: number,
    recordsPerPage: number,
    toBlock: number,
    fedContract: IFederation,
  ) {
    for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
      let toPagedBlock = fromPageBlock + recordsPerPage - 1;
      if (currentPage === numberOfPages) {
        toPagedBlock = toBlock;
      }

      this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
      const heartbeatLogs = await fedContract.getPastEvents('HeartBeat', {
        fromBlock: fromPageBlock,
        toBlock: toPagedBlock,
      });

      if (!heartbeatLogs) {
        throw new Error('Failed to obtain HeartBeat logs');
      }

      await this._processHeartbeatLogs(heartbeatLogs);

      this.logger.info(`Found ${heartbeatLogs.length} heartbeatLogs`);

      this._saveProgress(this.lastBlockPath, toPagedBlock);
      fromPageBlock = toPagedBlock + 1;
    }
  }

  async readLogs() {
    await this._checkIfRsk();
    const retryCounter = new typescriptUtils.RetryCounter({ log: this.logger });
    const sleepAfterRetrie = 3000;
    while (retryCounter.hasAttempts()) {
      try {
        const currentBlock = await this.mainWeb3.eth.getBlockNumber();
        const fedContract = await this.federationFactory.createInstance(this.config.mainchain, this.config.privateKey);

        const toBlock = currentBlock;
        this.logger.info('Running to Block', toBlock);

        if (toBlock <= 0) {
          return false;
        }

        this.checkStoragePath();
        let fromBlock = this.getFromBlock();

        if (fromBlock >= toBlock) {
          this.logger.warn(
            `Current chain Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`,
          );
          return false;
        }
        fromBlock = fromBlock + 1;
        this.logger.debug('Running from Block', fromBlock);

        const recordsPerPage = 1000;
        const numberOfPages = Math.ceil((toBlock - fromBlock) / recordsPerPage);
        this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

        await this.handleReadLogsPage(numberOfPages, fromBlock, recordsPerPage, toBlock, fedContract);
        return true;
      } catch (err) {
        this.logger.error(new Error('Exception Running Federator'), err);
        retryCounter.useAttempt();
        this.logger.debug(`Run ${retryCounter.initialAttempts - retryCounter.attemptsLeft()} retrie`);
        if (!retryCounter.hasAttempts()) {
          process.exit(1);
        }
        await utils.sleep(sleepAfterRetrie);
      }
    }
    return false;
  }

  async _processHeartbeatLogs(logs) {
    /*
        if node it's not synchronizing, do ->
    */
    try {
      for (const log of logs) {
        if (log.returnValues.fedChainsIds) {
          // New heartbeat event (FederationV3)
          const { sender, fedVersion, currentBlock, fedChainsIds, fedChainsBlocks, fedChainsInfo } = log.returnValues;
          this._trackHeartbeatMetrics(sender, fedVersion, currentBlock, fedChainsIds, fedChainsBlocks, fedChainsInfo);
        } else {
          // Old heartbeat event (FederationV2)
          const { sender, fedRskBlock, fedEthBlock, federatorVersion, nodeRskInfo, nodeEthInfo } = log.returnValues;
          const sideChain = this.sideChains.find((x) => x.chainId == 1 || x.chainId == 42);
          this._trackHeartbeatMetrics(
            sender,
            federatorVersion,
            log.blockNumber,
            [this.config.mainchain.chainId, sideChain.chainId],
            [fedRskBlock, fedEthBlock],
            [nodeRskInfo, nodeEthInfo],
          );
        }
      }

      return true;
    } catch (err) {
      throw new CustomError(`Exception processing HeartBeat logs`, err);
    }
  }

  async _emitHeartbeat(fedVersion: string, fedChainsIds: any[], fedChainsBlocks: any[], fedChainInfo: any[]) {
    try {
      const fedContract = await this.federationFactory.createInstance(this.config.mainchain, this.config.privateKey);
      const from = await this.transactionSender.getAddress(this.config.privateKey);
      const isMember = await fedContract.isMember(from);
      if (!isMember) {
        this.logger.warn(`This Federator addr:${from} is not part of the federation`)
        return false;
      }

      this.logger.info(`emitHeartbeat(${fedVersion}, ${fedChainsIds}, ${fedChainsBlocks}, ${fedChainInfo})`);
      const result = await fedContract.emitHeartbeat(
        this.transactionSender,
        fedVersion,
        fedChainsIds,
        fedChainsBlocks,
        fedChainInfo,
      );
      this._trackHeartbeatMetrics(from, fedVersion, result.blockNumber, fedChainsIds, fedChainsBlocks, fedChainInfo);
      this.logger.trace(`Success emitting heartbeat`);
      return true;
    } catch (err) {
      throw new CustomError(
        `Exception Emitting Heartbeat fedVersion: ${fedVersion} fedChainIds: ${fedChainsIds} fedChainsBlocks: ${fedChainsBlocks} fedChainsBlocks: ${fedChainInfo}`,
        err,
      );
    }
  }

  _trackHeartbeatMetrics(
    sender: string,
    fedVersion: string,
    eventBlock: number,
    fedChainsIds: any[],
    fedChainsBlocks: any[],
    fedChainsInfo: any[],
  ) {
    for (let i = 0; i < fedChainsIds.length; i++) {
      let logInfo = `[event: HeartBeat],`;
      logInfo += `[sender: ${sender}],`;
      logInfo += `[eventBlock: ${eventBlock}],`;
      logInfo += `[fedVersion: ${fedVersion}],`;
      logInfo += `[chainId: ${fedChainsIds[i]}],`;
      logInfo += `[blockNumber: ${fedChainsBlocks[i]}],`;
      logInfo += `[chainInfo: ${fedChainsInfo[i]}]`;
      this.logger.info(logInfo);

      if (utils.checkIfItsInRSK(fedChainsIds[i])) {
        this.metricCollector?.trackMainChainHeartbeatEmission(
          sender,
          fedVersion,
          fedChainsBlocks[i],
          fedChainsInfo[i],
          fedChainsIds[i],
        );
      } else {
        this.metricCollector?.trackSideChainHeartbeatEmission(
          sender,
          fedVersion,
          fedChainsBlocks[i],
          fedChainsInfo[i],
          fedChainsIds[i],
        );
      }
    }
  }

  _saveProgress(path, value) {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }

  async _checkIfRsk() {
    const chainId = this.config.mainchain.chainId;
    if (!utils.checkIfItsInRSK(chainId)) {
      this.logger.error(new Error(`Heartbeat should only run on RSK ${chainId}`));
      process.exit(1);
    }
  }
}

export default Heartbeat;
