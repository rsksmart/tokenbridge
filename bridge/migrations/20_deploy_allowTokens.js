//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensProxy = artifacts.require("AllowTokensProxy");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const BridgeProxy = artifacts.require("BridgeProxy");
const toWei = web3.utils.toWei;

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(AllowTokens);
    const allowTokensLogic = await AllowTokens.deployed();

    const bridgeProxy = await BridgeProxy.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const proxyAdmin = await ProxyAdmin.deployed();

    let smallAmountConfirmations = '0';
    let mediumAmountConfirmations = '0';
    let largeAmountConfirmations = '0';
    if (networkName == 'rsktestnet') {
        smallAmountConfirmations = '2';
        mediumAmountConfirmations = '4';
        largeAmountConfirmations = '10';
    }
    if (networkName == 'kovan') {
        smallAmountConfirmations = '10';
        mediumAmountConfirmations = '20';
        largeAmountConfirmations = '40';
    }
    if (networkName == 'rskmainnet') {
        smallAmountConfirmations = '30';
        mediumAmountConfirmations = '60';
        largeAmountConfirmations = '2880';
    }
    if (networkName == 'ethmainnet') {
        smallAmountConfirmations = '60';
        mediumAmountConfirmations = '120';
        largeAmountConfirmations = '5760';
    }
    const initData = allowTokensLogic.contract.methods.initialize(accounts[0], bridgeProxy.address, smallAmountConfirmations, mediumAmountConfirmations , largeAmountConfirmations).encodeABI();
    await deployer.deploy(AllowTokensProxy, allowTokensLogic.address, proxyAdmin.address, initData);
    const allowTokensProxy = await AllowTokensProxy.deployed();
    const allowTokens = await AllowTokens.at(allowTokensProxy.address);

    await allowTokens.addTokenType('BTC', {
        min:toWei('0.001'),
        max:toWei('25'),
        daily:toWei('100'),
        mediumAmount:toWei('0.1'),
        largeAmount:toWei('1') });

    await allowTokens.addTokenType('ETH', {
        min:toWei('0.01'),
        max:toWei('750'),
        daily:toWei('3000'),
        mediumAmount:toWei('3'),
        largeAmount:toWei('30') });

    await allowTokens.addTokenType('<100usd', {
        min:toWei('0.1'),
        max:toWei('25000'),
        daily:toWei('50000'),
        mediumAmount:toWei('100'),
        largeAmount:toWei('1000') });

    await allowTokens.addTokenType('=1usd', {
        min:toWei('1'),
        max:toWei('2500000'),
        daily:toWei('5000000'),
        mediumAmount:toWei('10000'),
        largeAmount:toWei('100000') });

    await allowTokens.addTokenType('<1usd', {
        min:toWei('100'),
        max:toWei('250000000'),
        daily:toWei('500000000'),
        mediumAmount:toWei('1000000'),
        largeAmount:toWei('10000000') });

    await allowTokens.addTokenType('<1cent', {
        min:toWei('10000'),
        max:toWei('25000000000'),
        daily:toWei('50000000000'),
        mediumAmount:toWei('100000000'),
        largeAmount:toWei('1000000000') });

    if (networkName == 'rsktestnet') {
        await setTokensTestnet(allowTokens);
    }
    if (networkName == 'kovan') {
        await setTokensKovan(allowTokens);
    }
    if (networkName == 'rskmainnet') {
        await setTokensMainnet(allowTokens);
    }
    if (networkName == 'ethmainnet') {
        await setTokensEthereum(allowTokens);
    }
    //Set multisig as the owner
    await allowTokens.transferOwnership(multiSig.address);
}

async function setTokensTestnet(allowTokens) {
    await allowTokens.setToken('0x09b6ca5e4496238a1f176aea6bb607db96c2286e', '0'); //WRBTC
    await allowTokens.setToken('0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', '4'); //RIF
    await allowTokens.setToken('0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', '3'); //DOC
    await allowTokens.setToken('0x4da7997a819bb46b6758b9102234c289dd2ad3bf', '0'); //BPro
}

async function setTokensKovan(allowTokens) {
    await allowTokens.setToken('0xd1b98b6607330172f1d991521145a22bce793277', '0'); //WBTC
    await allowTokens.setToken('0x0a9add98c076448cbcfacf5e457da12ddbef4a8f', '0'); //renBTC
    await allowTokens.setToken('0xd0A1E359811322d97991E03f863a0C30C2cF029C', '1'); //WETH
    await allowTokens.setToken('0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', '3'); //SAI
    await allowTokens.setToken('0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', '3'); //DAI
    await allowTokens.setToken('0x0000000000085d4780B73119b644AE5ecd22b376', '3'); //TUSD
    await allowTokens.setToken('0xe22da380ee6B445bb8273C81944ADEB6E8450422', '3'); //USDC
    await allowTokens.setToken('0x13512979ade267ab5100878e2e0f485b568328a4', '3'); //USDT
    await allowTokens.setToken('0xa36085F69e2889c224210F603D836748e7dC0088', '2'); //LINK
    await allowTokens.setToken('0x8d3e855f3f55109d473735ab76f753218400fe96', '2'); //BUND
}

async function setTokensMainnet(allowTokens) {
    await allowTokens.setToken('0x967f8799af07df1534d48a95a5c9febe92c53ae0', '0'); //WRBTC
    await allowTokens.setToken('0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', '4'); //RIF
    await allowTokens.setToken('0xe700691da7b9851f2f35f8b8182c69c53ccad9db', '3'); //DOC
    await allowTokens.setToken('0x440cd83c160de5c96ddb20246815ea44c7abbca8', '0'); //BPro
}

async function setTokensEthereum(allowTokens) {
    await allowTokens.setToken('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0'); //WBTC
    await allowTokens.setToken('0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', '0'); //renBTC
    await allowTokens.setToken('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '1'); //WETH
    await allowTokens.setToken('0x6b175474e89094c44da98b954eedeac495271d0f', '3'); //DAI
    await allowTokens.setToken('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '3'); //USDC
    await allowTokens.setToken('0xdac17f958d2ee523a2206206994597c13d831ec7', '3'); //USDT
    await allowTokens.setToken('0x514910771af9ca656af840dff83e8264ecf986ca', '2'); //LINK
    await allowTokens.setToken('0x8d3e855f3f55109d473735ab76f753218400fe96', '2'); //BUND
    await allowTokens.setToken('0xf04a8ac553fcedb5ba99a64799155826c136b0be', '5'); //FLIXX
    await allowTokens.setToken('0xa1d6Df714F91DeBF4e0802A542E13067f31b8262', '5'); //RFOXs
}