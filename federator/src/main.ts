import { Config } from './lib/config';
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
  metricCollector: MetricCollector;
  rskFederator: Federator;
  rskFederatorNFT: FederatorNFT;
  config: Config;
  heartbeat: Heartbeat;

  constructor() {
    this.logger = Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR);
    this.config = Config.getInstance();
    this.endpoint = new Endpoint(this.logger, this.config.endpointsPort);
    this.endpoint.init();
    try {
      this.metricCollector = new MetricCollector();
    } catch (error) {
      this.logger.warn(`Error creating MetricCollector instance:`, error);
    }

    this.heartbeat = new Heartbeat(
      this.config,
      Logs.getInstance().getLogger(LOGGER_CATEGORY_HEARTBEAT),
      this.metricCollector,
    );
    // TODO uncoment this after tests
    this.scheduleHeartbeatProcesses();

    this.rskFederator = new Federator(
      this.config,
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_MAIN),
      this.metricCollector,
    );
    this.rskFederatorNFT = new FederatorNFT(
      this.config,
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_NFT_MAIN),
      this.metricCollector,
    );

    const pollingInterval = this.config.runEvery * 1000 * 60; // Minutes
    const scheduler = new Scheduler(pollingInterval, this.logger, { run: () => this.run() });
    scheduler.start().catch((err) => {
      this.logger.error('Unhandled Error on scheduler.start()', err);
    });
  }

  async run() {
    try {
      // TODO uncoment this after tests
      await this.heartbeat.readLogs();
      await this.runNftRskFederator();
      await this.runErcRskFederator();

      for (const sideChainConfig of this.config.sidechain) {
        await this.runNftOtherChainFederator(sideChainConfig);
        await this.runErcOtherChainFederator(sideChainConfig);
      }
    } catch (err) {
      this.logger.error('Unhandled Error on run()', err);
      process.exit(1);
    }
  }

  async runErcRskFederator() {
    this.logger.info('RSK Host', this.config.mainchain.host);
    await this.rskFederator.runAll();
  }

  async runErcOtherChainFederator(sideChainConfig: ConfigChain) {
    const sideFederator = new Federator(
      {
        ...this.config,
        mainchain: sideChainConfig,
        sidechain: [this.config.mainchain],
      },
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_SIDE),
      this.metricCollector,
    );

    this.logger.info('Side Host', sideChainConfig.host);
    await sideFederator.runAll();
  }

  async runNftRskFederator() {
    if (!this.config.useNft) {
      return;
    }
    if (this.config.mainchain.nftBridge == null) {
      throw new Error('Main Federator NFT Bridge empty at config.mainchain.nftBridge');
    }
    await this.rskFederatorNFT.runAll();
  }

  async runNftOtherChainFederator(sideChainConfig: ConfigChain) {
    if (!this.config.useNft) {
      return;
    }

    const sideFederatorNFT = new FederatorNFT(
      {
        ...this.config,
        mainchain: sideChainConfig,
        sidechain: [this.config.mainchain],
      },
      Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_NFT_SIDE),
      this.metricCollector,
    );
    if (sideChainConfig.nftBridge == null) {
      throw Error('Side Federator NFT Bridge empty at sideChainConfig');
    }
    await sideFederatorNFT.runAll();
  }

  async scheduleHeartbeatProcesses() {
    const heartBeatPollingInterval = await utils.getHeartbeatPollingInterval({
      host: this.config.mainchain.host,
      runHeartbeatEvery: this.config.runHeartbeatEvery,
    });

    const heartBeatScheduler = new Scheduler(heartBeatPollingInterval, this.logger, {
      run: async () => {
        try {
          await this.heartbeat.run();
        } catch (err) {
          this.logger.error('Unhandled Error on runHeartbeat()', err);
          process.exit(1);
        }
      },
    });

    heartBeatScheduler.start().catch((err) => {
      this.logger.error('Unhandled Error on heartBeatScheduler.start()', err);
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
