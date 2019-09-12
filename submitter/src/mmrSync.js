const log4js = require('log4js');

// Configurations
const config = require('../config.js');
const logConfig = require('../log-config.json');
log4js.configure(logConfig);

// Services
const Scheduler = require('./services/Scheduler.js');
const RskMMR = require('./services/rsk/RskMMR.js');

const logger = log4js.getLogger('main');
logger.info('RSK Host', config.rsk.host);
logger.info('ETH Host', config.eth.host);

const rskMMR = new RskMMR(config, log4js.getLogger('RSK-MMR'));

let pollingInterval = config.mmrSyncInterval * 1000 * 60; // Minutes
let scheduler = new Scheduler(pollingInterval, logger, { run: () =>  run() });

scheduler.start().catch((err) => {
    logger.error('Unhandled Error on mmrSync start(): ', err);
});

async function run() {
    try {
        await rskMMR.run();
    } catch(err) {
        logger.error('Unhandled Error on mmrSync run(): ', err);
        process.exit();
    }
}

// export so we can test it
module.exports = { scheduler };
