import { Logger } from 'log4js';
import { Config } from './config';
import { MetricCollector } from './MetricCollector';

import web3 from 'web3';
import fs from 'fs';
import TransactionSender from './TransactionSender';
import { BridgeFactory } from '../contracts/BridgeFactory';
import { FederationFactory } from '../contracts/FederationFactory';
import { AllowTokensFactory } from '../contracts/AllowTokensFactory';
import utils from './utils';
import * as typescriptUtils from './typescriptUtils';
import { IFederationV3 } from '../contracts/IFederationV3';
import { IFederationV2 } from '../contracts/IFederationV2';
import { ConfigChain } from './configChain';
import { IFederation } from '../contracts/IFederation';

export default abstract class Federator {
  public logger: Logger;
  public config: Config;
  public metricCollector: MetricCollector;
  public chainId: number;
  public sideChain: ConfigChain;
  public web3ByHost: Map<string, web3>;
  private numberOfRetries: number;

  constructor(config: Config, logger: Logger, metricCollector: MetricCollector) {
    this.config = config;
    this.logger = logger;

    if (config.checkHttps && !utils.checkHttpsOrLocalhost(config.mainchain.host)) {
      this.logger.info('Check of checkHttpsOrLocalhost failed');
      throw new Error(`Invalid host configuration, https or localhost required`);
    }

    this.metricCollector = metricCollector;
    this.numberOfRetries = config.federatorRetries;
    this.web3ByHost = new Map<string, web3>();
    this.checkStoragePath();
  }

  async getCurrentChainId() {
    if (this.chainId === undefined) {
      this.chainId = await this.getMainChainWeb3().eth.net.getId();
    }
    return this.chainId;
  }

  async getChainId(client: web3) {
    return client.eth.net.getId();
  }

  getLastBlockPath(sideChainId: number, mainChainId: number): string {
    return `${this.config.storagePath}/lastBlock_${mainChainId}_${sideChainId}.txt`;
  }

  getRevertedTxnsPath(sideChainId: number, mainChainId: number): string {
    return `${this.config.storagePath}/revertedTxns_${mainChainId}_${sideChainId}.txt`;
  }

  getWeb3(host: string): web3 {
    let hostWeb3 = this.web3ByHost.get(host);
    if (!hostWeb3) {
      hostWeb3 = new web3(host);
      this.web3ByHost.set(host, hostWeb3);
    }
    return hostWeb3;
  }

  getMainChainWeb3(): web3 {
    return this.getWeb3(this.config.mainchain.host);
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

  private checkStoragePath() {
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, {
        recursive: true,
      });
    }
  }

  abstract run({
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
  }): Promise<boolean>;

  async runAll(): Promise<boolean> {
    for (const sideChainConfig of this.config.sidechain) {
      const sideChainWeb3 = this.getWeb3(sideChainConfig.host);
      const transactionSender = new TransactionSender(sideChainWeb3, this.logger, this.config);
      try {
        while (this.numberOfRetries > 0) {
          const bridgeFactory = new BridgeFactory(this.config, this.logger, sideChainConfig);
          const federationFactory = new FederationFactory(this.config, this.logger, sideChainConfig);
          const success: boolean = await this.run({
            sideChainConfig,
            sideChainWeb3,
            transactionSender,
            bridgeFactory,
            federationFactory,
          });
          if (success) {
            this.resetRetries();
            break;
          }
        }
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

  private resetRetries() {
    this.numberOfRetries = this.config.federatorRetries;
  }

  async checkFederatorIsMember(sideFedContract: IFederation, federatorAddress: string) {
    const isMember = await typescriptUtils.retryNTimes(sideFedContract.isMember(federatorAddress));
    if (!isMember) {
      throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
    }
  }

  _saveProgress(path, value) {
    if (value) {
      fs.writeFileSync(path, value.toString());
    }
  }
}
