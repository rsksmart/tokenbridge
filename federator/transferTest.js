const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('./config.js');
const logConfig = require('./log-config.json');
const abiBridge = require('./src/abis/Bridge.json');
const abiMainToken = require('./src/abis/IERC20.json');
//utils
const TransactionSender = require('./src/services/TransactionSender.js');
const Federator = require('./src/lib/Federator.js');
const utils = require('./src/lib/utils.js');

const logger = log4js.getLogger('test');
log4js.configure(logConfig);
logger.info('----------- Transfer Test ---------------------');
logger.info('Mainchain Host', config.mainchain.host);
logger.info('Sidechain Host', config.sidechain.host);

run();

async function run() {
    try {
        let federator = new Federator(config, log4js.getLogger('FEDERATOR'));
        let mainchainWeb3 = new Web3(config.mainchain.host);
        let sidechainWeb3 = new Web3(config.sidechain.host);

        const mainTokenContract = new mainchainWeb3.eth.Contract(abiMainToken, config.mainchain.testToken);
        const transactionSender = new TransactionSender(mainchainWeb3, logger);

        const mainBridgeAddress = config.mainchain.bridge;
        let amount = mainchainWeb3.utils.toWei('1');
        const senderAddress = await transactionSender.getAddress(config.mainchain.privateKey);
        const mainTokenAddress = mainTokenContract.options.address;
        logger.info(`Main token addres ${mainTokenAddress} - Sender Address: ${senderAddress}`);

        logger.debug('Aprove token transfer');
        let data = mainTokenContract.methods.approve(mainBridgeAddress, amount).encodeABI();
        await transactionSender.sendTransaction(mainTokenAddress, data, 0, config.mainchain.privateKey);

        logger.debug('Bridge receiveTokens (transferFrom)');
        let bridgeContract = new mainchainWeb3.eth.Contract(abiBridge, mainBridgeAddress);
        data = bridgeContract.methods.receiveTokens(mainTokenAddress, amount).encodeABI();
        await transactionSender.sendTransaction(mainBridgeAddress, data, 0, config.mainchain.privateKey);

        let waitBlocks = config.confirmations;
        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(mainchainWeb3, waitBlocks);

        logger.debug('Start federator process');
        await federator.run();

        logger.debug('Get the side token address');
        let sideBridgeContract = new sidechainWeb3.eth.Contract(abiBridge, config.sidechain.bridge);
        let sideTokenAddress = await sideBridgeContract.methods.mappedTokens(mainTokenAddress).call();
        logger.info('Side token address', sideTokenAddress);

        logger.debug('Check balance on the other side');
        let sideTokenContract = new sidechainWeb3.eth.Contract(abiMainToken, sideTokenAddress);
        let balance = await sideTokenContract.methods.balanceOf(senderAddress).call();
        logger.info('Side token balance', balance);

    } catch(err) {
        logger.error('Unhandled Error on run()', err.stack);
        process.exit();
    }

}