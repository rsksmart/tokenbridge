const log4js = require("log4js");

// Configurations
const config = require("./lib/config").Config.getInstance();
const logConfig = require("../config/log-config.json");
const utils = require("./lib/utils.js");
log4js.configure(logConfig);

// Services
const Scheduler = require("./services/Scheduler.js");
const Federator = require("./lib/FederatorERC.js");
const FederatorNFT = require("./lib/FederatorNFT");
const Heartbeat = require("./lib/Heartbeat.js");
const MetricCollector = require("./lib/MetricCollector");
// Status Server
const StatusServer = require("./lib/Endpoints.js");
const logger = log4js.getLogger("Federators");
StatusServer.init(logger);

let metricCollector;
try {
  metricCollector = new MetricCollector.MetricCollector();
} catch (err) {
  logger.error(`Error creating MetricCollector instance:`, err);
}

let pollingInterval = config.runEvery * 1000 * 60; // Minutes
let scheduler = new Scheduler(pollingInterval, logger, { run: () => run() });

scheduler.start().catch((err) => {
  logger.error("Unhandled Error on start()", err);
});

const mainFederatorNFT = new FederatorNFT.FederatorNFT(
  {
    ...config,
    storagePath: `${config.storagePath}/nft`,
  },
  log4js.getLogger("MAIN-NFT-FEDERATOR"),
  metricCollector
);

async function run() {
  try {
    await runNftMainFederator();
    await runErcMainFederator();

    for (const sideChainConfig of config.sidechain) {
      const heartbeat = new Heartbeat(
        config,
        log4js.getLogger("HEARTBEAT"),
        metricCollector,
        sideChainConfig
      );

      await runNftSideFederators(sideChainConfig);
      await runErcSideFederator(sideChainConfig);

      await heartbeat.readLogs();
      scheduleHeartbeatProcesses(heartbeat);
    }
  } catch (err) {
    logger.error("Unhandled Error on run()", err);
    process.exit(1);
  }
}

const mainFederator = new Federator.default(
  config,
  log4js.getLogger("MAIN-FEDERATOR"),
  metricCollector
);

async function runErcMainFederator() {
  logger.info("RSK Host", config.mainchain.host);
  await mainFederator.runAll();
}

async function runErcSideFederator(sideChainConfig) {
  const sideFederator = new Federator.default(
    {
      ...config,
      mainchain: sideChainConfig,
      sidechain: [config.mainchain],
      storagePath: `${config.storagePath}/side-fed`,
    },
    log4js.getLogger("SIDE-FEDERATOR"),
    metricCollector
  );

  logger.info("Side Host", sideChainConfig.host);
  await sideFederator.runAll();
}

async function runNftMainFederator() {
  if (!config.useNft) {
    return;
  }
  if (config.mainchain.nftBridge == null) {
    throw new CustomError(
      "Main Federator NFT Bridge empty at config.mainchain.nftBridge"
    );
  }
  await mainFederatorNFT.runAll();
}

async function runNftSideFederators(sideChainConfig) {
  if (!config.useNft) {
    return;
  }

  const sideFederatorNFT = new FederatorNFT.FederatorNFT(
    {
      ...config,
      mainchain: sideChainConfig,
      sidechain: [config.mainchain],
      storagePath: `${config.storagePath}/nft/side-fed`,
    },
    log4js.getLogger("SIDE-NFT-FEDERATOR"),
    metricCollector
  );
  if (sideChainConfig.nftBridge == null) {
    throw new CustomError("Side Federator NFT Bridge empty at sideChainConfig");
  }
  await sideFederatorNFT.runAll();
}

async function scheduleHeartbeatProcesses(heartbeat) {
  const heartBeatPollingInterval = await utils.getHeartbeatPollingInterval({
    host: config.mainchain.host,
    runHeartbeatEvery: config.runHeartbeatEvery,
  });

  const heartBeatScheduler = new Scheduler(heartBeatPollingInterval, logger, {
    run: async function () {
      try {
        await heartbeat.run();
      } catch (err) {
        logger.error("Unhandled Error on runHeartbeat()", err);
        process.exit(1);
      }
    },
  });

  heartBeatScheduler.start().catch((err) => {
    logger.error("Unhandled Error on start()", err);
  });
}



async function exitHandler() {
  process.exit(1);
}

// catches ctrl+c event
process.on("SIGINT", exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler);
process.on("SIGUSR2", exitHandler);

// export so we can test it
module.exports = { scheduler };
