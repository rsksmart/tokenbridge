const fs = require('fs');
const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('../config/config.js');
const logConfig = require('../config/log-config.json');

//utils
const TransactionSender = require('../src/lib/TransactionSender.js');
const Federator = require('../src/lib/Federator.js');
const Heartbeat = require('../src/lib/Heartbeat.js');
const utils = require('../src/lib/utils.js');
const fundFederators = require('./fundFederators');

const logger = log4js.getLogger('test');
log4js.configure(logConfig);
logger.info('----------- Emit Heartbeat Test ---------------------');
logger.info('MainChain Host', config.mainchain.host);

const keys = process.argv[2] ? process.argv[2].replace(/ /g, '').split(',') : [];

const heartbeats = getHeartbeats(keys, config);
const federators = getFederators(keys, config);

run({ 
  heartbeats,
  federators,
  config
});

function getFederators(keys, config) {
    let federators = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let federator = new Federator({
                ...config,
                privateKey: key,
            },
            log4js.getLogger('FEDERATOR'));
            federators.push(federator);
        });
    } else {
        let federator = new Federator({
            ...config,
        }, log4js.getLogger('FEDERATOR'));
        federators.push(federator);
    }
    return federators;
}

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

async function run({ heartbeats, federators, config }) {
    logger.info('Starting emiting & listening to Heartbeats from main chain');
    await emitAndListenToHeartbeats(
      heartbeats,
      federators,
      config
    );
    logger.info('Completed emiting & listening to Heartbeats from main chain');
}

async function emitAndListenToHeartbeats(
  heartbeats,
  federators,
  config
) {
  try {
   
    let data = '';
    const originWeb3 = new Web3(config.mainchain.host);

    logger.debug('Starting heartbeat processes');

    // Start MAIN hearbeats with delay between them
    logger.debug('Fund heartbeats wallets');
    let heartbeatKeys = keys && keys.length ? keys : [config.privateKey];
    await fundFederators(config.mainchain.host, heartbeatKeys, config.mainchain.privateKey, originWeb3.utils.toWei('1'));

    await heartbeats.reduce(function(promise, item) {
        return promise.then(function() { return item.run(); })
    }, Promise.resolve());

    logger.debug('Starting federator processes');

    // Start MAIN federators with delay between them
    await federators.reduce(function(promise, item) {
        return promise.then(function() { return item.run(); })
    }, Promise.resolve());

    } catch(err) {
        logger.error('Unhandled error:', err.stack);
        process.exit();
    }
}

