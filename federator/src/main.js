const log4js = require('log4js');

// Configurations
const config = require('../config/config.js');
const logConfig = require('../config/log-config.json');
const utils = require('./lib/utils.js')
log4js.configure(logConfig);

// Services
const Scheduler = require('./services/Scheduler.js');
const Federator = require('./lib/Federator.js');
const FederatorNFT = require('./lib/FederatorNFT');
const Heartbeat = require('./lib/Heartbeat.js');
const MetricCollector = require('./lib/MetricCollector');

const logger = log4js.getLogger('Federators');
logger.info('RSK Host', config.mainchain.host);
logger.info('ETH Host', config.sidechain.host);

// Status Server
const StatusServer = require('./lib/Endpoints.js');
StatusServer.init(logger);

if(!config.mainchain || !config.sidechain) {
  logger.error('Mainchain and Sidechain configuration are required');
  process.exit(1);
}

if (!config.etherscanApiKey) {
  logger.error('Etherscan API configuration is required');
  process.exit(1);
}

const metricCollector = new MetricCollector.MetricCollector();

const heartbeat = new Heartbeat(config, log4js.getLogger('HEARTBEAT'), metricCollector);
const mainFederator = new Federator(config, log4js.getLogger('MAIN-FEDERATOR'), metricCollector);
const sideFederator = new Federator({
  ...config,
  mainchain: config.sidechain,
  sidechain: config.mainchain,
  storagePath: `${config.storagePath}/side-fed`
}, log4js.getLogger('SIDE-FEDERATOR'), metricCollector);

const mainFederatorNFT = new FederatorNFT.FederatorNFT({
    ...config,
    storagePath: `${config.storagePath}/nft`
  },
  log4js.getLogger("MAIN-NFT-FEDERATOR"),
  metricCollector
);

const sideFederatorNFT = new FederatorNFT.FederatorNFT({
    ...config,
    mainchain: config.sidechain,
    sidechain: config.mainchain,
    storagePath: `${config.storagePath}/nft/side-fed`
  },
  log4js.getLogger("SIDE-NFT-FEDERATOR"),
  metricCollector);

let pollingInterval = config.runEvery * 1000 * 60; // Minutes
let scheduler = new Scheduler(pollingInterval, logger, { run: () => run() });

scheduler.start().catch((err) => {
  logger.error('Unhandled Error on start()', err);
});

async function run() {
  try {
    await runNftFederator();
    await mainFederator.run();
    await sideFederator.run();
    await heartbeat.readLogs();
  } catch(err) {
    logger.error('Unhandled Error on run()', err);
    process.exit(1);
  }
}

async function runNftFederator() {
  if (!config.useNft) {
    return;
  }
  if (config.mainchain.nftBridge == null) {
    throw new CustomError('Main Federator NFT Bridge empty at config.mainchain.nftBridge');
  }
  await mainFederatorNFT.run();

  if (config.sidechain.nftBridge == null) {
    throw new CustomError('Side Federator NFT Bridge empty at config.sidechain.nftBridge');
  }
  await sideFederatorNFT.run();
}

async function scheduleHeartbeatProcesses() {
  const heartBeatPollingInterval = await utils.getHeartbeatPollingInterval({
    host: config.mainchain.host,
    runHeartbeatEvery: config.runHeartbeatEvery
  });

  const heartBeatScheduler = new Scheduler(
    heartBeatPollingInterval, logger, {
      run: async function() {
        try {
            await heartbeat.run();
        } catch(err) {
            logger.error('Unhandled Error on runHeartbeat()', err);
            process.exit(1);
        }
      }
    }
  );

  heartBeatScheduler.start().catch((err) => {
    logger.error('Unhandled Error on start()', err);
  });
}

scheduleHeartbeatProcesses();

async function exitHandler() {
  process.exit(1);
}

// catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

// export so we can test it
module.exports = { scheduler };
