const log4js = require('log4js');

// Configurations
const config = require('../config.js');
const logConfig = require('../log-config.json');
log4js.configure(logConfig);

// Services
const Scheduler = require('./services/Scheduler.js');
const RskMMR = require('./services/rsk/RskMMR.js');
const { memoryUsage } = require('./lib/utils');

const logger = log4js.getLogger('main');
logger.info('RSK Host', config.rsk.host);
logger.info('ETH Host', config.eth.host);
logger.debug(`Initial allocated memory: ${memoryUsage()} MB`);

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

process.stdin.resume(); // so the program will not close instantly

async function exitHandler() {
    rskMMR.exitHandler();

    process.exit();
}

// catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

//catches uncaught exceptions
process.on('uncaughtException', exitHandler);

// export so we can test it
module.exports = { scheduler };
