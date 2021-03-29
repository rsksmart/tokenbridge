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
    // await allowTokens.setToken('0x09b6ca5e4496238a1f176aea6bb607db96c2286e', '0'); //WRBTC
    await allowTokens.setMultipleTokens([
        { token: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', typeId: '4' }, //RIF
        { token: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', typeId: '3' }, //DOC
        { token: '0x4da7997a819bb46b6758b9102234c289dd2ad3bf', typeId: '0' }, //BPro
        // SideToken
        // await allowTokens.setToken('0xd1b98b6607330172f1d991521145a22bce793277', '0'); //rKovWBTC
        // await allowTokens.setToken('0x0a9add98c076448cbcfacf5e457da12ddbef4a8f', '0'); //rKovRenBTC
        { token: '0xd15cdd74dff1a6a81ca639b038839b126bc01ff9', typeId: '1' }, //rKovWETH
        { token: '0x0d86fca9be034a363cf12c9834af08d54a10451c', typeId: '3' }, //rKovSAI
        { token: '0x7b846216a194c69bb1ea52ea8faa92d314866451', typeId: '3' }, //rKovDAI
        { token: '0x0a8d098e31a60da2b9c874d97de6e6b385c28e9d', typeId: '3' }, //rKovTUSD
        { token: '0xed3334adb07a3a5947d268e5a8c67b84f5464963', typeId: '3' }, //rKovUSDC
        { token: '0x4cfE225cE54c6609a525768b13F7d87432358C57', typeId: '3' }, //rKovUSDT
        { token: '0x8bbbd80981fe76d44854d8df305e8985c19f0e78', typeId: '2' }, //rKovLINK
        { token: '0xe95afdfec031f7b9cd942eb7e60f053fb605dfcd', typeId: '2' }, //rKovsBUND
    ]);
}

async function setTokensKovan(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0xd1b98b6607330172f1d991521145a22bce793277', typeId: '0' }, //WBTC
        { token: '0x0a9add98c076448cbcfacf5e457da12ddbef4a8f', typeId: '0' }, //renBTC
        { token: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', typeId: '1' }, //WETH
        { token: '0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', typeId: '3' }, //SAI
        { token: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', typeId: '3' }, //DAI
        { token: '0x0000000000085d4780B73119b644AE5ecd22b376', typeId: '3' }, //TUSD
        { token: '0xe22da380ee6B445bb8273C81944ADEB6E8450422', typeId: '3' }, //USDC
        { token: '0x13512979ade267ab5100878e2e0f485b568328a4', typeId: '3' }, //USDT
        { token: '0xa36085F69e2889c224210F603D836748e7dC0088', typeId: '2' }, //LINK
        { token: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '2' }, //BUND
    // SideToken
        { token: '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', typeId: '4' }, //eRIF
        { token: '0x09a8f2041Be23e8eC3c72790C9A92089BC70FbCa', typeId: '3' }, //eDOC
        { token: '0xB3c9ec8833bfA0d382a183EcED27aBc079520928', typeId: '0' }, //eBPro
    ]);
}

async function setTokensMainnet(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db', typeId: '3' }, //DOC
        { token: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', typeId: '4' }, //RIF
        // await allowTokens.setToken('0x440cd83c160de5c96ddb20246815ea44c7abbca8', '0'); //BPro
        // await allowTokens.setToken('0x967f8799af07df1534d48a95a5c9febe92c53ae0', '0'); //WRBTC
        // Side Tokens
        { token: '0x6b1a73d547f4009a26b8485b63d7015d248ad406', typeId: '3' }, //rDAI
        { token: '0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4', typeId: '3' }, //rUSDC
        { token: '0xef213441a85df4d7acbdae0cf78004e1e486bb96', typeId: '3' }, //rUSDT
        { token: '0x14adae34bef7ca957ce2dde5add97ea050123827', typeId: '2' }, //rLINK
        { token: '0x4991516df6053121121274397a8c1dad608bc95b', typeId: '2' }, //rBUND
        { token: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '5' }, //rFLIXX
        { token: '0x9c3a5f8d686fade293c0ce989a62a34408c4e307', typeId: '5' }, //rRFOX
        // TODO  after crossing
        // await allowTokens.setToken('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0'); //rWBTC
        // await allowTokens.setToken('0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', '0'); //rRenBTC
        // await allowTokens.setToken('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '1'); //rWETH
    ]);
}

async function setTokensEthereum(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', typeId: '0' }, //WBTC
        { token: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', typeId: '0' }, //renBTC
        { token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', typeId: '1' }, //WETH
        { token: '0x6b175474e89094c44da98b954eedeac495271d0f', typeId: '3' }, //DAI
        { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', typeId: '3' }, //USDC
        { token: '0xdac17f958d2ee523a2206206994597c13d831ec7', typeId: '3' }, //USDT
        { token: '0x514910771af9ca656af840dff83e8264ecf986ca', typeId: '2' }, //LINK
        { token: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '2' }, //BUND
        { token: '0xf04a8ac553fcedb5ba99a64799155826c136b0be', typeId: '5' }, //FLIXX
        { token: '0xa1d6Df714F91DeBF4e0802A542E13067f31b8262', typeId: '5' }, //RFOX
        // Side Tokens
        { token: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', typeId: '4' }, //eRIF
        { token: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db', typeId: '3' }, //eDOC
        // TODO  after crossing
        // await allowTokens.setToken('0x967f8799af07df1534d48a95a5c9febe92c53ae0', '0'); //WRBTC
        // await allowTokens.setToken('0x440cd83c160de5c96ddb20246815ea44c7abbca8', '0'); //BPro
    ]);
}