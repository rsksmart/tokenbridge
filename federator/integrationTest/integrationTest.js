const fs = require('fs');
const Web3 = require('web3');
const log4js = require('log4js');

//configurations
const config = require('../config/config.js');
const logConfig = require('../config/log-config.json');
const abiBridge = require('../../abis/Bridge.json');
const abiMainToken = require('../../abis/ERC677.json');
const abiSideToken = require('../../abis/SideToken.json');
const abiAllowTokens = require('../../abis/AllowTokens.json');
const abiMultiSig = require('../../abis/MultiSigWallet.json');

//utils
const TransactionSender = require('../src/lib/TransactionSender.js');
const Federator = require('../src/lib/Federator.js');
const utils = require('../src/lib/utils.js');
const fundFederators = require('./fundFederators');

const sideTokenBytecode = fs.readFileSync(`${__dirname}/sideTokenBytecode.txt`, 'utf8');

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

const mainKeys = process.argv[2] ? process.argv[2].replace(/ /g, '').split(',') : [];
const sideKeys = process.argv[3] ? process.argv[3].replace(/ /g, '').split(',') : [];

const mainchainFederators = getMainchainFederators(mainKeys);
const sidechainFederators = getSidechainFederators(sideKeys, sideConfig);

run({ mainchainFederators, sidechainFederators, config, sideConfig });

function getMainchainFederators(keys) {
    let federators = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let federator = new Federator({
                ...config,
                privateKey: key,
                storagePath: `${config.storagePath}/fed-${i + 1}`
            }, log4js.getLogger('FEDERATOR'));
            federators.push(federator);
        });
    } else {
        let federator = new Federator(config, log4js.getLogger('FEDERATOR'));
        federators.push(federator);
    }
    return federators;
}

function getSidechainFederators(keys, sideConfig) {
    let federators = [];
    if (keys && keys.length) {
        keys.forEach((key, i) => {
            let federator = new Federator({
                ...sideConfig,
                privateKey: key,
                storagePath: `${config.storagePath}/side-fed-${i + 1}`
            },
            log4js.getLogger('FEDERATOR'));
            federators.push(federator);
        });
    } else {
        let federator = new Federator({
            ...sideConfig,
            storagePath: `${config.storagePath}/side-fed`,
        }, log4js.getLogger('FEDERATOR'));
        federators.push(federator);
    }
    return federators;
}

async function run({ mainchainFederators, sidechainFederators, config, sideConfig }) {
    logger.info('Starting transfer from Mainchain to Sidechain');
    await transfer(mainchainFederators, sidechainFederators, config, 'MAIN', 'SIDE');
    logger.info('Completed transfer from Mainchain to Sidechain');

    logger.info('Starting transfer from Sidechain to Mainchain');
    await transfer(sidechainFederators, mainchainFederators, sideConfig, 'SIDE', 'MAIN');
    logger.info('Completed transfer from Sidechain to Mainchain');
}

async function transfer(originFederators, destinationFederators, config, origin, destination) {
    try {
        let data = '';
        let originWeb3 = new Web3(config.mainchain.host);
        let destinationWeb3 = new Web3(config.sidechain.host);

        const originTokenContract = new originWeb3.eth.Contract(abiMainToken, config.mainchain.testToken);
        const transactionSender = new TransactionSender(originWeb3, logger, config);
        const destinationTransactionSender = new TransactionSender(destinationWeb3, logger, config);

        const originBridgeAddress = config.mainchain.bridge;
        const amount = originWeb3.utils.toWei('10');
        const originAddress = originTokenContract.options.address;
        const cowAddress = (await originWeb3.eth.getAccounts())[0];
        const allowTokensContract = new originWeb3.eth.Contract(abiAllowTokens, config.mainchain.allowTokens);

        logger.info('------------- SENDING THE TOKENS -----------------');
        logger.debug('Getting address from pk');
        const userPrivateKey = originWeb3.eth.accounts.create().privateKey;
        const userAddress = await transactionSender.getAddress(userPrivateKey);
        await transactionSender.sendTransaction(userAddress, '', originWeb3.utils.toWei('1'), config.privateKey);
        await destinationTransactionSender.sendTransaction(userAddress, '', originWeb3.utils.toWei('1'), config.privateKey);
        logger.info(`${origin} token addres ${originAddress} - User Address: ${userAddress}`);

        const initialUserBalance = await originWeb3.eth.getBalance(userAddress);
        logger.debug('Initial user balance ', initialUserBalance);
        await originTokenContract.methods.transfer(userAddress, amount).send({from: cowAddress});
        const initialTokenBalance = await originTokenContract.methods.balanceOf(userAddress).call();
        logger.debug('Initial token balance ', initialTokenBalance);

        logger.debug('Aproving token transfer');
        await originTokenContract.methods.transfer(userAddress, amount).call({from: userAddress});
        data = originTokenContract.methods.transfer(userAddress, amount).encodeABI();
        await transactionSender.sendTransaction(originAddress, data, 0, config.privateKey);
        await originTokenContract.methods.approve(originBridgeAddress, amount).call({from: userAddress});
        data = originTokenContract.methods.approve(originBridgeAddress, amount).encodeABI();
        await transactionSender.sendTransaction(originAddress, data, 0, userPrivateKey);
        logger.debug('Token transfer approved');

        logger.debug('Bridge receiveTokens (transferFrom)');
        let bridgeContract = new originWeb3.eth.Contract(abiBridge, originBridgeAddress);
        console.log('Bridge addr', originBridgeAddress)
        console.log('allowTokens addr', allowTokensContract.options.address)
        console.log('Bridge AllowTokensAddr', await bridgeContract.methods.allowTokens().call())
        console.log('allowTokens primary', await allowTokensContract.methods.primary().call())
        console.log('allowTokens owner', await allowTokensContract.methods.owner().call())
        console.log('accounts:', (await originWeb3.eth.getAccounts()));
        await bridgeContract.methods.receiveTokensTo(originAddress, userAddress, amount).call({from: userAddress});
        data = bridgeContract.methods.receiveTokensTo(originAddress, userAddress, amount).encodeABI();
        await transactionSender.sendTransaction(originBridgeAddress, data, 0, userPrivateKey);
        logger.debug('Bridge receivedTokens completed');

        let waitBlocks = config.confirmations;
        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(originWeb3, waitBlocks);

        logger.debug('Starting federator processes');

        // Start origin federators with delay between them
        logger.debug('Fund federator wallets');
        let federatorKeys = mainKeys && mainKeys.length ? mainKeys : [config.privateKey];
        await fundFederators(config.sidechain.host, federatorKeys, config.sidechain.privateKey, destinationWeb3.utils.toWei('1'));

        await originFederators.reduce(function(promise, item) {
            return promise.then(function() { return item.run(); })
        }, Promise.resolve());

        logger.info('------------- RECEIVE THE TOKENS ON THE OTHER SIDE -----------------');
        logger.debug('Get the destination token address');
        let destinationBridgeAddress = config.sidechain.bridge;
        logger.debug(`${destination} bridge address`, destinationBridgeAddress);
        let destinationBridgeContract = new destinationWeb3.eth.Contract(abiBridge, destinationBridgeAddress);
        let destinationTokenAddress = await destinationBridgeContract.methods.mappedTokens(originAddress).call();
        logger.info(`${destination} token address`, destinationTokenAddress);
        if(destinationTokenAddress == '0x0000000000000000000000000000000000000000') {
            logger.error('Token was not voted by federators');
            process.exit();
        }

        logger.debug('Check balance on the other side');
        let destinationTokenContract = new destinationWeb3.eth.Contract(abiSideToken, destinationTokenAddress);
        let balance = await destinationTokenContract.methods.balanceOf(userAddress).call();
        logger.info(`${destination} token balance`, balance);

        let crossCompletedBalance = await originWeb3.eth.getBalance(userAddress);
        logger.debug('One way cross user balance (ETH or RBTC)', crossCompletedBalance);

        // Transfer back
        logger.info('------------- TRANSFER BACK THE TOKENS -----------------');
        logger.debug('Getting initial balances before transfer');
        let bridgeBalanceBefore = await originTokenContract.methods.balanceOf(originBridgeAddress).call();
        let receiverBalanceBefore = await originTokenContract.methods.balanceOf(userAddress).call();
        let senderBalanceBefore = await destinationTokenContract.methods.balanceOf(userAddress).call();
        logger.debug(`bridge balance:${bridgeBalanceBefore}, receiver balance:${receiverBalanceBefore}, sender balance:${senderBalanceBefore} `);
        await destinationTransactionSender.sendTransaction(userAddress, "", 6000000, config.privateKey);

        logger.debug('Aproving token transfer on destination');
        data = destinationTokenContract.methods.approve(destinationBridgeAddress, amount).encodeABI();
        await destinationTransactionSender.sendTransaction(destinationTokenAddress, data, 0, userPrivateKey);
        logger.debug('Token transfer approved');
        let allowed = await destinationTokenContract.methods.allowance(userAddress, destinationBridgeAddress).call();
        logger.debug('Allowed to transfer ', allowed);

        logger.debug('Set side token limit');
        const sideMultiSigContract = new originWeb3.eth.Contract(abiMultiSig, config.sidechain.multiSig);
        const sideAllowTokensAddress = config.sidechain.allowTokens;

        if (federatorKeys.length === 1) {
            const multiSigData = sideMultiSigContract.methods.submitTransaction(sideAllowTokensAddress, 0, data).encodeABI();
            await destinationTransactionSender.sendTransaction(config.sidechain.multiSig, multiSigData, 0, '');
        } else {
            let multiSigData = sideMultiSigContract.methods.submitTransaction(sideAllowTokensAddress, 0, data).encodeABI();
            await destinationTransactionSender.sendTransaction(config.sidechain.multiSig, multiSigData, 0, federatorKeys[0]);

            let nextTransactionCount = await sideMultiSigContract.methods.getTransactionCount(true, false).call();
            for (let i = 1; i < federatorKeys.length; i++) {
                multiSigData = sideMultiSigContract.methods.confirmTransaction(nextTransactionCount).encodeABI();
                await destinationTransactionSender.sendTransaction(config.sidechain.multiSig, multiSigData, 0, federatorKeys[i]);
            }
        }


        logger.debug('Bridge side receiveTokens');
        await destinationBridgeContract.methods.receiveTokensTo(destinationTokenAddress, userAddress, amount).call({from: userAddress});
        data = destinationBridgeContract.methods.receiveTokensTo(destinationTokenAddress, userAddress, amount).encodeABI();
        await destinationTransactionSender.sendTransaction(destinationBridgeAddress, data, 0, userPrivateKey);
        logger.debug('Bridge side receiveTokens completed');

        logger.debug('Starting federator processes');

        logger.debug('Fund federator wallets');
        federatorKeys = sideKeys && sideKeys.length ? sideKeys : [config.privateKey];
        await fundFederators(config.mainchain.host, federatorKeys, config.mainchain.privateKey, originWeb3.utils.toWei('1'));

        // Start destination federators with delay between them
        await destinationFederators.reduce(function(promise, item) {
            return promise.then(function() { return item.run(); })
        }, Promise.resolve());

        logger.info('------------- RECEIVE THE TOKENS ON THE STARTING SIDE -----------------');
        logger.debug('Getting final balances');
        let bridgeBalanceAfter = await originTokenContract.methods.balanceOf(originBridgeAddress).call();
        let receiverBalanceAfter = await originTokenContract.methods.balanceOf(userAddress).call();
        let senderBalanceAfter = await destinationTokenContract.methods.balanceOf(userAddress).call();
        logger.debug(`bridge balance:${bridgeBalanceAfter}, receiver balance:${receiverBalanceAfter}, sender balance:${senderBalanceAfter} `);

        let expectedBalance = BigInt(bridgeBalanceBefore) - BigInt(amount);
        if (expectedBalance !== BigInt(bridgeBalanceAfter)) {
            logger.warn(`Wrong Bridge balance. Expected ${expectedBalance} but got ${bridgeBalanceAfter}`);
        }

        expectedBalance = BigInt(receiverBalanceBefore) + BigInt(amount);
        if (expectedBalance !== BigInt(receiverBalanceAfter)) {
            logger.warn(`Wrong Receiver balance. Expected ${receiverBalanceBefore} but got ${receiverBalanceAfter}`);
        }

        expectedBalance = BigInt(senderBalanceBefore) - BigInt(amount);
        if (expectedBalance !== BigInt(senderBalanceAfter)) {
            logger.warn(`Wrong Sender balance. Expected ${expectedBalance} but got ${senderBalanceAfter}`);
        }

        let crossBackCompletedBalance = await originWeb3.eth.getBalance(userAddress);
        logger.debug('Final user balance', crossBackCompletedBalance);
        logger.debug('Cost: ', BigInt(initialUserBalance) - BigInt(crossBackCompletedBalance));

        logger.info('------------- START CONTRACT ERC777 TEST TOKEN SEND TEST -----------------');
        const AnotherToken = new originWeb3.eth.Contract(abiSideToken);
        const knownAccount = (await originWeb3.eth.getAccounts())[0];

        logger.debug('Deploying another token contract');
        const anotherTokenContract = await AnotherToken.deploy({
            data: sideTokenBytecode,
            arguments: ["MAIN", "MAIN", userAddress, "1"]
        }).send({
            from: knownAccount,
            gas: 6700000,
            gasPrice: 20000000000
        });
        logger.debug('Token deployed');
        logger.debug('Minting new token');
        const anotherTokenAddress = anotherTokenContract.options.address;
        data = anotherTokenContract.methods.mint(userAddress, amount, '0x', '0x').encodeABI();
        await transactionSender.sendTransaction(anotherTokenAddress, data, 0, userPrivateKey);

        logger.debug('Adding new token to list of allowed on bridge');
        const multiSigContract = new originWeb3.eth.Contract(abiMultiSig, config.mainchain.multiSig);
        const allowTokensAddress = allowTokensContract.options.address;
        let typeId = 0;
        data = allowTokensContract.methods.setToken(anotherTokenAddress, typeId).encodeABI();

        if (federatorKeys.length === 1) {
            const multiSigData = multiSigContract.methods.submitTransaction(allowTokensAddress, 0, data).encodeABI();
            await transactionSender.sendTransaction(config.mainchain.multiSig, multiSigData, 0, '');
        } else {
            let multiSigData = multiSigContract.methods.submitTransaction(allowTokensAddress, 0, data).encodeABI();
            await transactionSender.sendTransaction(config.mainchain.multiSig, multiSigData, 0, federatorKeys[0]);

            let nextTransactionCount = await multiSigContract.methods.getTransactionCount(true, false).call();
            for (let i = 1; i < federatorKeys.length; i++) {
                multiSigData = multiSigContract.methods.confirmTransaction(nextTransactionCount).encodeABI();
                await transactionSender.sendTransaction(config.mainchain.multiSig, multiSigData, 0, federatorKeys[i]);
            }
        }

        await anotherTokenContract.methods.send(originBridgeAddress, amount, '0x').call({from:userAddress});
        data = anotherTokenContract.methods.send(originBridgeAddress, amount, '0x').encodeABI();
        await transactionSender.sendTransaction(anotherTokenContract.options.address, data, 0, userPrivateKey);
        logger.debug('Call to transferAndCall completed');

        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(originWeb3, waitBlocks);

        await originFederators.reduce(function(promise, item) {
            return promise.then(function() { return item.run(); })
        }, Promise.resolve());

        logger.info('------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE OTHER SIDE -----------------');
        logger.debug('Check balance on the other side');
        balance = await destinationTokenContract.methods.balanceOf(userAddress).call();
        logger.info(`${destination} token balance`, balance);

        crossCompletedBalance = await originWeb3.eth.getBalance(userAddress);
        logger.debug('One way cross user balance', crossCompletedBalance);

        logger.info('------------- CONTRACT ERC777 TEST TRANSFER BACK THE TOKENS -----------------');
        senderBalanceBefore = await destinationTokenContract.methods.balanceOf(userAddress).call();

        data = destinationTokenContract.methods.send(destinationBridgeAddress, amount, '0x').encodeABI();
        await transactionSender.sendTransaction(destinationTokenAddress, data, 0, userPrivateKey);

        logger.debug(`Wait for ${waitBlocks} blocks`);
        await utils.waitBlocks(destinationWeb3, waitBlocks);

        await destinationFederators.reduce(function(promise, item) {
            return promise.then(function() { return item.run(); })
        }, Promise.resolve());

        logger.info('------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE STARTING SIDE -----------------');
        logger.debug('Getting final balances');
        bridgeBalanceAfter = await originTokenContract.methods.balanceOf(originBridgeAddress).call();
        receiverBalanceAfter = await originTokenContract.methods.balanceOf(userAddress).call();
        senderBalanceAfter = await destinationTokenContract.methods.balanceOf(userAddress).call();
        logger.debug(`bridge balance:${bridgeBalanceAfter}, receiver balance:${receiverBalanceAfter}, sender balance:${senderBalanceAfter} `);

        if (senderBalanceBefore === BigInt(senderBalanceAfter)) {
            logger.warn(`Wrong Sender balance. Expected Sender balance to change but got ${senderBalanceAfter}`);
        }

        crossBackCompletedBalance = await originWeb3.eth.getBalance(userAddress);
        logger.debug('Final user balance', crossBackCompletedBalance);

    } catch(err) {
        logger.error('Unhandled error:', err.stack);
        process.exit();
    }
}
