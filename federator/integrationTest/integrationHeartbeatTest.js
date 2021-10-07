const fs = require('fs');
const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('../config/config.js');
const logConfig = require('../config/log-config.json');

//utils
const Heartbeat = require('../src/lib/Heartbeat.js');
const fundFederators = require('./fundFederators');

const logger = log4js.getLogger('HEARTBEAT');
log4js.configure(logConfig);
logger.info('----------- Emit Heartbeat Test ---------------------');
logger.info('MainChain Host', config.mainchain.host);

const keys = process.argv[2] ? process.argv[2].replace(/ /g, '').split(',') : [];

const heartbeats = getHeartbeats(keys, config);

run({
  heartbeats,
  config
});

function getHeartbeats(keys, config) {
    let heartbeats = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let heartbeat = new Heartbeat({
                ...config,
                privateKey: key,
            },
            log4js.getLogger('HEARTBEAT'));
            heartbeats.push(heartbeat);
        });
    } else {
        let heartbeat = new Heartbeat({
            ...config,
        }, log4js.getLogger('HEARTBEAT'));
        heartbeats.push(heartbeat);
    }
    return heartbeats;
}

async function run({ heartbeats, config }) {
    logger.info('Starting emiting & listening to Heartbeats from main chain');
    await emitAndListenToHeartbeats(
      heartbeats,
      config
    );
    logger.info('Completed emiting & listening to Heartbeats from main chain');
}

async function emitAndListenToHeartbeats(
  heartbeats,
  config
) {
  try {

    logger.debug('Starting heartbeat processes');

    // Start MAIN hearbeats with delay between them
    logger.debug('Fund heartbeats wallets');
    let heartbeatKeys = keys && keys.length ? keys : [config.privateKey];
    await fundFederators(config.mainchain.host, heartbeatKeys, config.mainchain.privateKey, Web3.utils.toWei('1'));

    await heartbeats.reduce(function(promise, item) {
        return promise.then(function() { return item.run(); })
    }, Promise.resolve());

    logger.debug('Starting federator processes');

    // Start readLogs processes...
    await heartbeats.reduce(function(promise, item) {
        return promise.then(function() { return item.readLogs(); })
    }, Promise.resolve());

    // check if HeartBeat Event is in log file
    const logFileContent = fs.readFileSync(
      `${__dirname}/../heartbeat.log`,
      {encoding:'utf8', flag:'r'}
    );

    if(logFileContent.indexOf('HeartBeat') > -1) {
        logger.info('HeartBeat Event detected on Log File');
    } else {
        logger.error('HeartBeat Event NOT detected on Log File');
        process.exit(1);
    }

    } catch(err) {
        logger.error('Unhandled error:', err.stack);
        process.exit(1);
    }
}
