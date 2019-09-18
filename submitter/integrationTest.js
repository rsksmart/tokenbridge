var Web3 = require('web3');
var log4js = require('log4js');
//configurations
const config = require('./config.js');
const logConfig = require('./log-config.json');
log4js.configure(logConfig);
//Services
const RskMMR = require('./src/services/rsk/RskMMR.js');
const RskCrossToEth = require('./src/services/rsk/RskCrossToEth.js');
const RskCreateEvent = require('./src/services/rsk/RskCreateEvent.js');
//abis
const abiBridge = require('./src/abis/Bridge.json');
const abiMainToken = require('./src/abis/MainToken.json');
//utils
const TransactionSender = require('./src/lib/TransactionSender.js');


const logger = log4js.getLogger('test');
logger.info('----------- Integration Test ---------------------');
logger.info('RSK Host', config.rsk.host);
logger.info('ETH Host', config.eth.host);

const rskMMR = new RskMMR(config, log4js.getLogger('RSK-MMR'));
const rskCrossToEth = new RskCrossToEth(config, log4js.getLogger('RSK-TO-ETH'));
const rskCreateEvent = new RskCreateEvent(config, log4js.getLogger('RSK-CREATE-EVENT'));

run();

async function run() {
    try {
        let ethWeb3 = new Web3(config.eth.host);
        let rskWeb3 = new Web3(config.rsk.host);

        const mainTokenContract = new rskWeb3.eth.Contract(abiMainToken, config.rsk.testToken);
        const transactionSender = new TransactionSender(rskWeb3, logger);

        const bridgeAddress = config.rsk.bridge;
        let amount = rskWeb3.utils.toWei('1');
        logger.info('aprove token transfer');
        const senderAddress = await transactionSender.getAddress(config.rsk.privateKey);
        let data = mainTokenContract.methods.approve(bridgeAddress, amount).encodeABI();
        console.log(mainTokenContract.options.address);
        const mainTokenAddress = mainTokenContract.options.address;
        await transactionSender.sendTransaction(mainTokenAddress, data, 0, config.rsk.privateKey);

        logger.info('bridge receiveTokens (transferFrom)');
        let bridgeContract = new rskWeb3.eth.Contract(abiBridge, bridgeAddress);
        data = bridgeContract.methods.receiveTokens(mainTokenAddress, amount).encodeABI();
        await transactionSender.sendTransaction(bridgeAddress, data, 0, config.rsk.privateKey);

        logger.info('bridge create event');
        let isEventCreated = await rskCreateEvent.run();

        logger.info('update MMR');
        await rskMMR.run();

        logger.info('cross the token');
        await rskCrossToEth.run(isEventCreated);

        logger.info('get the side token address');
        let sideBridgeContract = new ethWeb3.eth.Contract(abiBridge, config.eth.bridge);
        let sideTokenAddress = await sideBridgeContract.methods.mappedTokens(mainTokenAddress).call();
        logger.info('side token address', sideTokenAddress);

        logger.info('check balance on the other side');
        let sideTokenContract = new ethWeb3.eth.Contract(abiMainToken, sideTokenAddress);
        let balance = await sideTokenContract.methods.balanceOf(senderAddress).call();
        logger.info('side token balance', balance);

    } catch(err) {
        logger.error('Unhandled Error on run()', err.stack);
        process.exit();
    }

}