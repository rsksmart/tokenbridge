import log4js from 'log4js';
import { Config } from './lib/config';
import logConfig from '../config/log-config.json';
import * as utils from './lib/utils';
import Scheduler from './services/Scheduler';
import Federator from './lib/FederatorERC';
import FederatorNFT from './lib/FederatorNFT';
import Heartbeat from './lib/Heartbeat';
import { MetricCollector } from './lib/MetricCollector';
import { Endpoint } from './lib/Endpoints';
import { ConfigChain } from './lib/configChain';
import { LogWrapper } from './lib/logWrapper';
import {
  Logs,
  LOGGER_CATEGORY_FEDERATOR,
  LOGGER_CATEGORY_FEDERATOR_MAIN,
  LOGGER_CATEGORY_FEDERATOR_NFT_MAIN,
  LOGGER_CATEGORY_FEDERATOR_SIDE,
  LOGGER_CATEGORY_FEDERATOR_NFT_SIDE,
  LOGGER_CATEGORY_HEARTBEAT,
} from './lib/logs';

export class Main {
  logger: LogWrapper;
  endpoint: any;
  metricCollector: any;
  mainFederator: Federator;
  mainFederatorNFT: FederatorNFT;
  config: Config;

  constructor() {
    this.logger = Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR);
    this.config = Config.getInstance();
    this.endpoint = new Endpoint(this.logger, this.config.endpointsPort);
    this.endpoint.init();
    let metricCollector;
    try {
      metricCollector = new MetricCollector();
    } catch (error) {
      this.logger.error(`Error creating MetricCollector instance:`, error);
    }

    const pollingInterval = this.config.runEvery * 1000 * 60; // Minutes
    const scheduler = new Scheduler(pollingInterval, this.logger, { run: () => this.run() });
    this.mainFederator = new Federator(
      this.config,
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_MAIN),
      this.metricCollector,
    );
    log4js.configure(logConfig);
    this.mainFederatorNFT = new FederatorNFT(
      {
        ...this.config,
        storagePath: `${this.config.storagePath}/nft`,
      },
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_NFT_MAIN),
      metricCollector,
    );

    scheduler.start().catch((err) => {
      this.logger.error('Unhandled Error on start()', err);
    });
  }

  async run() {
    try {
      await this.runNftMainFederator();
      await this.runErcMainFederator();

      for (const sideChainConfig of this.config.sidechain) {
        const heartbeat = new Heartbeat(
          this.config,
          Logs.getInstance().getLogger(LOGGER_CATEGORY_HEARTBEAT),
          this.metricCollector,
          sideChainConfig,
        );

        await this.runNftSideFederators(sideChainConfig);
        await this.runErcSideFederator(sideChainConfig);

        await heartbeat.readLogs();
        this.scheduleHeartbeatProcesses(heartbeat);
      }
    } catch (err) {
      this.logger.error('Unhandled Error on run()', err);
      process.exit(1);
    }
  }

  async runErcMainFederator() {
    this.logger.info('RSK Host', this.config.mainchain.host);
    await this.mainFederator.runAll();
  }

  async runErcSideFederator(sideChainConfig) {
    const sideFederator = new Federator(
      {
        ...this.config,
        mainchain: sideChainConfig,
        sidechain: [this.config.mainchain],
        storagePath: `${this.config.storagePath}/side-fed`,
      },
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_SIDE),
      this.metricCollector,
    );

    this.logger.info('Side Host', sideChainConfig.host);
    await sideFederator.runAll();
  }

  async runNftMainFederator() {
    if (!this.config.useNft) {
      return;
    }
    if (this.config.mainchain.nftBridge == null) {
      throw new Error('Main Federator NFT Bridge empty at config.mainchain.nftBridge');
    }
    await this.mainFederatorNFT.runAll();
  }

  async runNftSideFederators(sideChainConfig: ConfigChain) {
    if (!this.config.useNft) {
      return;
    }

    const sideFederatorNFT = new FederatorNFT(
      {
        ...this.config,
        mainchain: sideChainConfig,
        sidechain: [this.config.mainchain],
        storagePath: `${this.config.storagePath}/nft/side-fed`,
      },
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_NFT_SIDE),
      this.metricCollector,
    );
    if (sideChainConfig.nftBridge == null) {
      throw Error('Side Federator NFT Bridge empty at sideChainConfig');
    }
    await sideFederatorNFT.runAll();
  }

  async scheduleHeartbeatProcesses(heartbeat) {
    const heartBeatPollingInterval = await utils.getHeartbeatPollingInterval({
      host: this.config.mainchain.host,
      runHeartbeatEvery: this.config.runHeartbeatEvery,
    });

    const heartBeatScheduler = new Scheduler(heartBeatPollingInterval, this.logger, {
      run: async function () {
        try {
          await heartbeat.run();
        } catch (err) {
          this.logger.error('Unhandled Error on runHeartbeat()', err);
          process.exit(1);
        }
      },
    });

    heartBeatScheduler.start().catch((err) => {
      this.logger.error('Unhandled Error on start()', err);
    });
  }
}

const main = new Main();
main.run();

async function exitHandler() {
  process.exit(1);
}
// catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);
