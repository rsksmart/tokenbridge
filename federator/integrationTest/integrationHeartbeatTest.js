const fs = require('fs');
const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('../config/config.js');
const logConfig = require('../config/log-config.json');
const abiBridge = require('../../abis/Bridge.json');
const abiMainToken = require('../../abis/ERC677.json');
const abiSideToken = require('../../abis/SideToken.json');
const abiAllowTokens = require('../../abis/AllowTokens.json');
const abiMultiSig = require('../../abis/MultiSigWallet.json');

//utils
const TransactionSender = require('../src/lib/TransactionSender.js');
const Federator = require('../src/lib/Federator.js');
const Heartbeat = require('../src/lib/Heartbeat.js');
const utils = require('../src/lib/utils.js');
const fundFederators = require('./fundFederators');

const sideTokenBytecode = fs.readFileSync(`${__dirname}/sideTokenBytecode.txt`, 'utf8');

const logger = log4js.getLogger('test');
log4js.configure(logConfig);
logger.info('----------- Emit Heartbeat Test ---------------------');
logger.info('Sidechain Host', config.sidechain.host);

const sideConfig = {
    ...config,
    confirmations: 0,
    mainchain: config.sidechain,
    sidechain: config.mainchain,
};

const mainKeys = process.argv[2] ? process.argv[2].replace(/ /g, '').split(',') : [];
const sideKeys = process.argv[3] ? process.argv[3].replace(/ /g, '').split(',') : [];

const sidechainHeartbeats = getSidechainHeartbeats(sideKeys, sideConfig);
const sidechainFederators = getSidechainFederators(sideKeys, sideConfig);

run({ 
  sidechainHeartbeats,
  sidechainFederators,
  config,
  sideConfig 
});

function getSidechainFederators(keys, sideConfig) {
    let federators = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let federator = new Federator({
                ...sideConfig,
                privateKey: key,
                storagePath: `${config.storagePath}/side-fed-${i + 1}`
            },
            log4js.getLogger('FEDERATOR'));
            federators.push(federator);
        });
    } else {
        let federator = new Federator({
            ...sideConfig,
            storagePath: `${config.storagePath}/side-fed`,
        }, log4js.getLogger('FEDERATOR'));
        federators.push(federator);
    }
    return federators;
}

function getSidechainHeartbeats(keys, sideConfig) {
    let heartbeats = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let heartbeat = new Heartbeat({
                ...sideConfig,
                privateKey: key,
                storagePath: `${config.storagePath}/side-fed-${i + 1}`
            },
            log4js.getLogger('HEARTBEAT'));
            heartbeats.push(heartbeat);
        });
    } else {
        let heartbeat = new Heartbeat({
            ...sideConfig,
            storagePath: `${config.storagePath}/side-fed`,
        }, log4js.getLogger('HEARTBEAT'));
        heartbeats.push(heartbeat);
    }
    return heartbeats;
}

async function run({ sidechainHeartbeats, sidechainFederators, config, sideConfig }) {
    logger.info('Starting emiting & listening to Heartbeats from SideChain');
    await emitAndListeToHeartbeats(
      sidechainHeartbeats,
      sidechainFederators,
      config,
      sideConfig
    );
    logger.info('Completed emiting & listening to Heartbeats from SideChain');
}

async function emitAndListeToHeartbeats(
  sidechainHeartbeats,
  sidechainFederators,
  config,
  sideConfig 
) {
  try {
   
    let data = '';
    const destinationWeb3 = new Web3(config.sidechain.host);

    logger.debug('Starting heartbeat processes');

    // Start side hearbeats with delay between them
    logger.debug('Fund heartbeats wallets');
    let heartbeatKeys = sideKeys && sideKeys.length ? sideKeys : [config.privateKey];
    await fundFederators(config.sidechain.host, heartbeatKeys, config.sidechain.privateKey, destinationWeb3.utils.toWei('1'));

    await sidechainHeartbeats.reduce(function(promise, item) {
        return promise.then(function() { return item.run(); })
    }, Promise.resolve());

    logger.debug('Starting federator processes');

    // Start side federators with delay between them
    logger.debug('Fund federator wallets');
    let federatorKeys = mainKeys && mainKeys.length ? mainKeys : [config.privateKey];
    await fundFederators(config.sidechain.host, federatorKeys, config.sidechain.privateKey, destinationWeb3.utils.toWei('1'));

    await sidechainFederators.reduce(function(promise, item) {
        return promise.then(function() { return item.run(); })
    }, Promise.resolve());

    } catch(err) {
        logger.error('Unhandled error:', err.stack);
        process.exit();
    }
}

