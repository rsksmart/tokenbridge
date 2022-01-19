const fs = require("fs");
const Web3 = require("web3");

//configurations
const config = require("../config/test.local.config.js");

//utils
const Heartbeat = require("../src/lib/Heartbeat");
const fundFederators = require("./fundFederators");
const logs = require("../src/lib/logs");
const logWrapper = logs.Logs.getInstance().getLogger(
  logs.LOGGER_CATEGORY_HEARTBEAT
);
logWrapper.info("----------- Emit Heartbeat Test ---------------------");
logWrapper.info("MainChain Host", config.mainchain.host);

const keys = process.argv[2]
  ? process.argv[2].replace(/ /g, "").split(",")
  : [];

run({
  heartbeats: getHeartbeats(keys),
  config,
});

function getHeartbeats(keys) {
  const heartbeats = [];
  if (keys && keys.length) {
    keys.forEach((key) => {
      const heartbeat = new Heartbeat.default(
        {
          ...config,
          privateKey: key,
        },
        logWrapper
      );
      heartbeats.push(heartbeat);
    });
  } else {
    const heartbeat = new Heartbeat.default(
      {
        ...config,
      },
      logWrapper
    );
    heartbeats.push(heartbeat);
  }
  return heartbeats;
}

async function run({ heartbeats }) {
  logWrapper.info("Starting emiting & listening to Heartbeats from main chain");
  await emitAndListenToHeartbeats(heartbeats);
  logWrapper.info(
    "Completed emiting & listening to Heartbeats from main chain"
  );
}

async function emitAndListenToHeartbeats(heartbeats) {
  try {
    logWrapper.debug("Starting heartbeat processes");

    // Start MAIN hearbeats with delay between them
    logWrapper.debug("Fund heartbeats wallets");
    let heartbeatKeys = keys && keys.length ? keys : [config.privateKey];
    await fundFederators(
      config.mainchain.host,
      heartbeatKeys,
      config.mainchain.privateKey,
      Web3.utils.toWei("1")
    );

    await heartbeats.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logWrapper.debug("Starting federator processes");

    // Start readLogs processes...
    await heartbeats.reduce(function (promise, item) {
      return promise.then(function () {
        return item.readLogs();
      });
    }, Promise.resolve());

    // check if HeartBeat Event is in log file
    const logFileContent = fs.readFileSync(`${__dirname}/../heartbeat.log`, {
      encoding: "utf8",
      flag: "r",
    });

    if (logFileContent.indexOf("HeartBeat") > -1) {
      logWrapper.info("HeartBeat Event detected on Log File");
    } else {
      logWrapper.error("HeartBeat Event NOT detected on Log File");
      process.exit(1);
    }
  } catch (err) {
    logWrapper.error("Unhandled error:", err.stack);
    process.exit(1);
  }
}
