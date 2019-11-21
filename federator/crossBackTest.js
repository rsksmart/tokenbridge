const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('./config.js');
const logConfig = require('./log-config.json');
const abiBridge = require('./src/abis/Bridge_v0.json');
const abiMainToken = require('./src/abis/IERC20.json');
//utils
const TransactionSender = require('./src/lib/TransactionSender.js');
const Federator = require('./src/lib/Federator.js');
const utils = require('./src/lib/utils.js');

const logger = log4js.getLogger('test');
log4js.configure(logConfig);
logger.info('----------- Transfer Test ---------------------');
logger.info('Mainchain Host', config.mainchain.host);
logger.info('Sidechain Host', config.sidechain.host);

const sideConfig = {
    ...config,
    confirmations: 0,
    mainchain: config.sidechain,
    sidechain: config.mainchain,
};

const keys = process.argv[3] ? process.argv[3].split(',') : [];
const sidechainFederators = getSidechainFederators(keys, sideConfig);

crossBack(sidechainFederators);

function getSidechainFederators(keys, sideConfig) {
    let federators = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let federator = new Federator({
                ...sideConfig,
                privateKey: key,
                storagePath: `${config.storagePath}/cross-back-fed-${i + 1}`
            },
            log4js.getLogger('FEDERATOR'));
            federators.push(federator);
        });
    } else {
        let federator = new Federator({
            ...sideConfig,
            storagePath: `${config.storagePath}/cross-back-fed`,
        }, log4js.getLogger('FEDERATOR'));
        federators.push(federator);
    }
    return federators;
}

async function crossBack(federators) {
    const mainchainWeb3 = new Web3(config.mainchain.host);
    const sidechainWeb3 = new Web3(config.sidechain.host);

    const transactionSender = new TransactionSender(sidechainWeb3, logger);
    const anAccount = (await sidechainWeb3.eth.getAccounts())[1];
    const amount = sidechainWeb3.utils.toWei('1');

    const mainTokenContract = new mainchainWeb3.eth.Contract(abiMainToken, config.mainchain.testToken);
    const mainBridgeContract = new mainchainWeb3.eth.Contract(abiBridge, config.mainchain.bridge);
    const sideBridgeContract = new sidechainWeb3.eth.Contract(abiBridge, config.sidechain.bridge);

    const mappedAddress = await mainBridgeContract.methods.getMappedAddress(mainTokenContract.options.address).call();
    const sideTokenContract = new sidechainWeb3.eth.Contract(abiMainToken, mappedAddress);

    logger.debug('Aproving token transfer on sidechain');
    let data = sideTokenContract.methods.approve(sideBridgeContract.options.address, amount).encodeABI();
    await transactionSender.sendTransaction(sideTokenContract.options.address, data, 0, null, anAccount);
    logger.debug('Token transfer approved');

    logger.debug('Bridge side receiveTokens');
    data = sideBridgeContract.methods.receiveTokens(sideTokenContract.options.address, amount).encodeABI();
    await transactionSender.sendTransaction(sideBridgeContract.options.address, data, 0, null, anAccount);
    logger.debug('Bridge side receiveTokens completed');

    logger.debug('Starting federator processes');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Start federators with delay between them
    await federators.reduce(function(promise, item) {
        return promise.then(function() {
            return Promise.all([delay(5000), item.run()]);
        })
    }, Promise.resolve());


    logger.debug('Check balance on the other side');
    let brideBalance = await mainTokenContract.methods.balanceOf(mainBridgeContract.options.address).call();
    logger.info('Bridge balance is ', brideBalance);

    let anAccountBalance = await mainTokenContract.methods.balanceOf(anAccount).call();
    logger.info('An account balance is ', anAccountBalance);
}

