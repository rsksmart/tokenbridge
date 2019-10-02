var log4js = require('log4js');
//configurations
const config = require('../config.js');
const logConfig = require('../log-config.json');
log4js.configure(logConfig);
//Services
const Scheduler = require('./services/Scheduler.js');
const MMRController = require('./lib/mmr/MMRController.js');
const RskMMR = require('./services/rsk/RskMMR.js');
const RskCrossToEth = require('./services/rsk/RskCrossToEth.js');
const RskCreateEvent = require('./services/rsk/RskCreateEvent.js');


const logger = log4js.getLogger('main');
logger.info('RSK Host', config.rskHost);
logger.info('ETH Host', config.ethHost);
logger.info('Confirmations', config.confirmations);
logger.info('mmrBlockConfirmations', config.mmrBlockConfirmations);

const mmrController = new MMRController(config, log4js.getLogger('MMR-CONTROLLER'));
const rskMMR = new RskMMR(config, log4js.getLogger('RSK-MMR'), mmrController);
const rskCrossToEth = new RskCrossToEth(config, log4js.getLogger('RSK-TO-ETH'), mmrController);
const rskCreateEvent = new RskCreateEvent(config, log4js.getLogger('RSK-CREATE-EVENT'));

let pollingInterval = config.runEvery *1000*60; //In Minutes
let scheduler = new Scheduler(pollingInterval, logger, { run: () => run() });

scheduler.start()
    .catch((err) => {
    logger.error('Unhandled Error on start()', err);
});

async function run() {
    try {
        let isEventCreated = await rskCreateEvent.run();
        await rskMMR.run();
        await rskCrossToEth.run(isEventCreated);
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
