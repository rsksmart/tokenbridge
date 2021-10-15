const Web3 = require('web3');
const log4js = require('log4js');
//configurations
const config = require('../config/config.js');
const abiBridgeV2 = require('../../bridge/abi/BridgeV2.json');
const erc20TokenAbi = require('../../bridge/abi/IERC20.json');
//utils
const TransactionSender = require('../src/lib/TransactionSender.js');
const utils = require('../src/lib/utils.js');


const logger = log4js.getLogger('test');
logger.level = 'debug';
logger.info('----------- Transfering tokens to the Bridge ---------------------');
logger.info('RSK Host', config.mainchain.host);
logger.info('ETH Host', config.sidechain.host);


run();

async function run() {
    try {
        let rskWeb3 = new Web3(config.mainchain.host);
        let ethWeb3 = new Web3(config.sidechain.host);

        const mainTokenContract = new rskWeb3.eth.Contract(erc20TokenAbi, config.mainchain.testToken);
        const transactionSender = new TransactionSender(rskWeb3, logger, config);

        const bridgeAddress = config.mainchain.bridge;
        let amount = rskWeb3.utils.toWei('1');
        const senderAddress = await transactionSender.getAddress(config.privateKey);
        const mainTokenAddress = mainTokenContract.options.address;
        logger.info('Main token addres' + mainTokenAddress + 'Sender Address:' + senderAddress + ' Bridge Address:' + bridgeAddress);

        logger.debug('approve token transfer');
        let data = mainTokenContract.methods.approve(bridgeAddress, amount).encodeABI();
        await transactionSender.sendTransaction(mainTokenAddress, data, 0, config.privateKey);

        logger.debug('bridge receiveTokens (transferFrom)');
        let bridgeContract = new rskWeb3.eth.Contract(abiBridgeV2, bridgeAddress);
        data = bridgeContract.methods.receiveTokensTo(mainTokenAddress, senderAddress, amount).encodeABI();
        await transactionSender.sendTransaction(bridgeAddress, data, 0, config.privateKey);

        //Wait for confirmations
        let waitBlocks = config.confirmations;
        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(rskWeb3, waitBlocks);
        logger.debug(`Wait for poll ${config.runEvery} minutes`);
        await utils.sleep(config.runEvery * 60 * 1000);

        logger.debug('get the side token address');
        let sideBridgeContract = new ethWeb3.eth.Contract(abiBridgeV2, config.sidechain.bridge);
        let sideTokenAddress = await sideBridgeContract.methods.mappedTokens(mainTokenAddress).call();
        logger.info('side token address', sideTokenAddress);

        logger.debug('check balance on the other side');
        let sideTokenContract = new ethWeb3.eth.Contract(erc20TokenAbi, sideTokenAddress);
        let balance = await sideTokenContract.methods.balanceOf(senderAddress).call();
        logger.info('side token balance', balance);

    } catch(err) {
        logger.error('Unhandled Error on run()', err.stack);
        process.exit(1);
    }

}
