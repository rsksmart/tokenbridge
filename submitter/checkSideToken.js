var Web3 = require('web3');
var log4js = require('log4js');
//configurations
const config = require('./config.js');
const abiBridge = require('./src/abis/Bridge.json');
const abiMainToken = require('./src/abis/IERC20.json');
//utils
const TransactionSender = require('./src/lib/TransactionSender.js');
const utils = require('./src/lib/utils.js');


const logger = log4js.getLogger('test');
logger.level = 'debug';
logger.info('----------- Integration Test ---------------------');
logger.info('RSK Host', config.rsk.host);
logger.info('ETH Host', config.eth.host);


run();

async function run() {
    try {
        let ethWeb3 = new Web3(config.eth.host);
        let rskWeb3 = new Web3(config.rsk.host);

        const mainTokenContract = new rskWeb3.eth.Contract(abiMainToken, config.rsk.testToken);
        const transactionSender = new TransactionSender(rskWeb3, logger);

        const bridgeAddress = config.rsk.bridge;
        let amount = rskWeb3.utils.toWei('1');
        const senderAddress = await transactionSender.getAddress(config.rsk.privateKey);
        const mainTokenAddress = mainTokenContract.options.address;
        logger.info('Main token addres' + mainTokenAddress + 'Sender Address:' + senderAddress);
/*
        logger.debug('approve token transfer');
        let data = mainTokenContract.methods.approve(bridgeAddress, amount).encodeABI();
        await transactionSender.sendTransaction(mainTokenAddress, data, 0, config.rsk.privateKey);

        logger.debug('bridge receiveTokens (transferFrom)');
        let bridgeContract = new rskWeb3.eth.Contract(abiBridge, bridgeAddress);
        data = bridgeContract.methods.receiveTokens(mainTokenAddress, amount).encodeABI();
        await transactionSender.sendTransaction(bridgeAddress, data, 0, config.rsk.privateKey);

        //This may varies according to the number of token logs or mmr block samples
        let waitBlocks = 8;
        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(ethWeb3, waitBlocks);
*/
        logger.debug('get the side token address');
        let sideBridgeContract = new ethWeb3.eth.Contract(abiBridge, config.eth.bridge);
        let sideTokenAddress = await sideBridgeContract.methods.mappedTokens(mainTokenAddress).call();
        logger.info('side token address', sideTokenAddress);

        logger.debug('check balance on the other side');
        let sideTokenContract = new ethWeb3.eth.Contract(abiMainToken, sideTokenAddress);
        let balance = await sideTokenContract.methods.balanceOf(senderAddress).call();
        logger.info('side token balance', balance);

    } catch(err) {
        logger.error('Unhandled Error on run()', err.stack);
        process.exit();
    }

}