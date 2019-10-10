const log4js = require('log4js');

// Configurations
const config = require('../config.js');
const logConfig = require('../log-config.json');
log4js.configure(logConfig);

// Services
const Scheduler = require('./services/Scheduler.js');
const EventCreator = require('./services/EventCreator.js');
const Federator = require('./lib/federated/Federator.js');

const logger = log4js.getLogger('main');
logger.info('RSK Host', config.rsk.host);
logger.info('ETH Host', config.eth.host);

const federatorId = process.argv[2];
if (!federatorId) {
    logger.error('Federator id must be provided as an argument');
    process.exit();
}
if (!config.members[federatorId]) {
    logger.error('Invalid federator id');
    process.exit();
}

if(!config.mainchain || !config.sidechain) {
    logger.error('Mainchain and Sidechain configuration are required');
    process.exit();
}

const federator = new Federator(config, log4js.getLogger('FEDERATOR'), federatorId);
// const eventCreator = new EventCreator(config, logger);

let pollingInterval = config.runEvery * 1000 * 60; // Minutes
let scheduler = new Scheduler(pollingInterval, logger, { run: () => run() });

scheduler.start().catch((err) => {
    logger.error('Unhandled Error on start()', err);
});

async function run() {
    try {
        //let isEventCreated = await eventCreator.run();
        federator.run();
    } catch(err) {
        logger.error('Unhandled Error on run()', err);
        process.exit();
    }
}

async function exitHandler() {
    await rskMMR.exitHandler();

    process.exit();
}

// catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

// export so we can test it
module.exports = { scheduler };
