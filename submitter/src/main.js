var log4js = require('log4js');
//configurations
const config = require('../config.js');
const logConfig = require('../log-config.json');
log4js.configure(logConfig);
//Services
const Scheduler = require('./services/Scheduler.js');
const RskMMR = require('./services/rsk/RskMMR.js');
const RskCrossToEth = require('./services/rsk/RskCrossToEth.js');
const RskCreateEvent = require('./services/rsk/RskCreateEvent.js');


const logger = log4js.getLogger('main');
logger.info('RSK Host', config.rskHost);
logger.info('ETH Host', config.ethHost);

const rskMMR = new RskMMR(config, log4js.getLogger('RSK-MMR'));
const rskCrossToEth = new RskCrossToEth(config, log4js.getLogger('RSK-TO-ETH'));
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