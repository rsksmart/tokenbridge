//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensProxy = artifacts.require("AllowTokensProxy");
const toWei = web3.utils.toWei;
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(AllowTokens);
    const allowTokensLogic = await AllowTokens.deployed();
    deployedJson.AllowTokens = allowTokensLogic.address.toLowerCase();

    deployedJson.smallAmountConfirmations = deployedJson.smallAmountConfirmations || '12';
    deployedJson.mediumAmountConfirmations = deployedJson.mediumAmountConfirmations || '12';
    deployedJson.largeAmountConfirmations = deployedJson.largeAmountConfirmations || '12';

    const typesInfo = networkName == 'rskmainnet' || networkName == 'ethmainnet' || networkName == 'rinkeby' || networkName == 'ropsten' || networkName == 'bchmainnet' || networkName == 'bscmainnet'
    ? tokensTypesMainnet()
    : tokensTypesTestnet();

    const initData = allowTokensLogic.contract.methods.initialize(
        accounts[0],
        deployedJson.BridgeProxy,
        deployedJson.smallAmountConfirmations,
        deployedJson.mediumAmountConfirmations,
        deployedJson.largeAmountConfirmations,
        typesInfo
    ).encodeABI();
    await deployer.deploy(AllowTokensProxy, allowTokensLogic.address, deployedJson.ProxyAdmin, initData);

    const allowTokensProxy = await AllowTokensProxy.deployed();
    deployedJson.AllowTokensProxy = allowTokensProxy.address.toLowerCase();
    const allowTokens = await AllowTokens.at(allowTokensProxy.address);
    deployHelper.saveDeployed(deployedJson);

    if (networkName == 'rsktestnet') {
        await setTokensRskTestnet(allowTokens);
    }
    if (networkName == 'kovan') {
        await setTokensKovan(allowTokens);
    }
    if (networkName == 'rskmainnet') {
        await setTokensRskMainnet(allowTokens);
    }
    if (networkName == 'ethmainnet') {
        await setTokensEthereum(allowTokens);
    }
    if (networkName == 'bchmainnet') {
        await setTokensBCH(allowTokens);
    }
    if (networkName == 'bscmainnet') {
        await setTokensBSC(allowTokens);
    }
    //Set multisig as the owner
    await allowTokens.transferOwnership(deployedJson.MultiSig);
}

function tokensTypesMainnet() {
    return [
        { description: 'BTC', limits: {
            min:toWei('0.0001'),
            max:toWei('25000'),
            daily:toWei('100000'),
            mediumAmount:toWei('100'),
            largeAmount:toWei('1000') }
        },
        { description: 'ETH', limits: {
            min:toWei('0.005'),
            max:toWei('750000'),
            daily:toWei('3000000'),
            mediumAmount:toWei('3000'),
            largeAmount:toWei('30000') }
        },
        { description: '<1000usd', limits: {
            min:toWei('0.01'),
            max:toWei('2500000'),
            daily:toWei('5000000'),
            mediumAmount:toWei('10000'),
            largeAmount:toWei('100000') }
        },
        { description: '<100usd', limits: {
            min:toWei('0.1'),
            max:toWei('25000000'),
            daily:toWei('50000000'),
            mediumAmount:toWei('100000'),
            largeAmount:toWei('1000000') }
        },
        { description: '=1usd', limits: {
            min:toWei('1'),
            max:toWei('2500000000'),
            daily:toWei('5000000000'),
            mediumAmount:toWei('10000000'),
            largeAmount:toWei('100000000') }
        },
        { description: '<1usd', limits: {
            min:toWei('10'),
            max:toWei('250000000000'),
            daily:toWei('500000000000'),
            mediumAmount:toWei('1000000000'),
            largeAmount:toWei('10000000000') }
        },
        { description: '<1cent', limits: {
            min:toWei('100'),
            max:toWei('25000000000000'),
            daily:toWei('50000000000000'),
            mediumAmount:toWei('100000000000'),
            largeAmount:toWei('1000000000000') }
        },
    ]
}

function tokensTypesTestnet() {
    return [
        { description: 'BTC', limits: {
            min:toWei('0.0001'),
            max:toWei('25000'),
            daily:toWei('100000'),
            mediumAmount:toWei('100'),
            largeAmount:toWei('1000') }
        },
        { description: 'ETH', limits: {
            min:toWei('0.005'),
            max:toWei('750000'),
            daily:toWei('3000000'),
            mediumAmount:toWei('3000'),
            largeAmount:toWei('30000') }
        },
        { description: '<1000usd', limits: {
            min:toWei('0.01'),
            max:toWei('2500000'),
            daily:toWei('5000000'),
            mediumAmount:toWei('10000'),
            largeAmount:toWei('100000') }
        },
        { description: '<100usd', limits: {
            min:toWei('0.1'),
            max:toWei('25000000'),
            daily:toWei('50000000'),
            mediumAmount:toWei('100000'),
            largeAmount:toWei('1000000') }
        },
        { description: '=1usd', limits: {
            min:toWei('1'),
            max:toWei('2500000000'),
            daily:toWei('5000000000'),
            mediumAmount:toWei('10000000'),
            largeAmount:toWei('100000000') }
        },
        { description: '<1usd', limits: {
            min:toWei('10'),
            max:toWei('250000000000'),
            daily:toWei('500000000000'),
            mediumAmount:toWei('1000000000'),
            largeAmount:toWei('10000000000') }
        },
        { description: '<1cent', limits: {
            min:toWei('100'),
            max:toWei('25000000000000'),
            daily:toWei('50000000000000'),
            mediumAmount:toWei('100000000000'),
            largeAmount:toWei('1000000000000') }
        },
    ]
}

async function setTokensRskTestnet(allowTokens) {
    // await allowTokens.setToken('0x09b6ca5e4496238a1f176aea6bb607db96c2286e', '0'); //WRBTC
    await allowTokens.setMultipleTokens([
        { token: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', typeId: '5' }, //RIF
        { token: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', typeId: '4' }, //DOC
        { token: '0x4da7997a819bb46b6758b9102234c289dd2ad3bf', typeId: '0' }, //BPro
        // SideToken
        { token: '0xd15cdd74dff1a6a81ca639b038839b126bc01ff9', typeId: '1' }, //rKovWETH
        { token: '0x0d86fca9be034a363cf12c9834af08d54a10451c', typeId: '4' }, //rKovSAI
        { token: '0x7b846216a194c69bb1ea52ea8faa92d314866451', typeId: '4' }, //rKovDAI
        { token: '0x0a8d098e31a60da2b9c874d97de6e6b385c28e9d', typeId: '4' }, //rKovTUSD
        { token: '0xed3334adb07a3a5947d268e5a8c67b84f5464963', typeId: '4' }, //rKovUSDC
        { token: '0x4cfE225cE54c6609a525768b13F7d87432358C57', typeId: '4' }, //rKovUSDT
        { token: '0x8bbbd80981fe76d44854d8df305e8985c19f0e78', typeId: '3' }, //rKovLINK
        { token: '0xe95afdfec031f7b9cd942eb7e60f053fb605dfcd', typeId: '3' }, //rKovsBUND
    ]);
}

async function setTokensKovan(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0xd1b98b6607330172f1d991521145a22bce793277', typeId: '0' }, //WBTC
        { token: '0x0a9add98c076448cbcfacf5e457da12ddbef4a8f', typeId: '0' }, //renBTC
        { token: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', typeId: '1' }, //WETH
        { token: '0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', typeId: '4' }, //SAI
        { token: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', typeId: '4' }, //DAI
        { token: '0x0000000000085d4780B73119b644AE5ecd22b376', typeId: '4' }, //TUSD
        { token: '0xe22da380ee6B445bb8273C81944ADEB6E8450422', typeId: '4' }, //USDC
        { token: '0x13512979ade267ab5100878e2e0f485b568328a4', typeId: '4' }, //USDT
        { token: '0xa36085F69e2889c224210F603D836748e7dC0088', typeId: '3' }, //LINK
        { token: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '3' }, //BUND
    // SideToken
        { token: '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', typeId: '5' }, //eRIF
        { token: '0x09a8f2041Be23e8eC3c72790C9A92089BC70FbCa', typeId: '4' }, //eDOC
        { token: '0xB3c9ec8833bfA0d382a183EcED27aBc079520928', typeId: '0' }, //eBPro
    ]);
}

async function setTokensRskMainnet(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db', typeId: '5' }, //DOC
        { token: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', typeId: '6' }, //RIF
        // await allowTokens.setToken('0x440cd83c160de5c96ddb20246815ea44c7abbca8', '0'); //BPro
        // await allowTokens.setToken('0x967f8799af07df1534d48a95a5c9febe92c53ae0', '0'); //WRBTC
        // Side Tokens
        { token: '0x6b1a73d547f4009a26b8485b63d7015d248ad406', typeId: '4' }, //rDAI
        { token: '0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4', typeId: '4' }, //rUSDC
        { token: '0xef213441a85df4d7acbdae0cf78004e1e486bb96', typeId: '4' }, //rUSDT
        { token: '0x14adae34bef7ca957ce2dde5add97ea050123827', typeId: '3' }, //rLINK
        { token: '0x4991516df6053121121274397a8c1dad608bc95b', typeId: '3' }, //rBUND
        { token: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '6' }, //rFLIXX
        { token: '0x9c3a5f8d686fade293c0ce989a62a34408c4e307', typeId: '6' }, //rRFOX
        { token: '0xff9ea341d9ea91cb7c54342354377f5104fd403f', typeId: '6' }, //rAMLT
    ]);
}

async function setTokensEthereum(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', typeId: '0' }, //WBTC
        { token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', typeId: '1' }, //WETH
        { token: '0x6b175474e89094c44da98b954eedeac495271d0f', typeId: '5' }, //DAI
        { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', typeId: '5' }, //USDC
        { token: '0xdac17f958d2ee523a2206206994597c13d831ec7', typeId: '5' }, //USDT
        { token: '0x514910771af9ca656af840dff83e8264ecf986ca', typeId: '4' }, //LINK
        { token: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', typeId: '3' }, //AAVE
        { token: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', typeId: '4' }, //SUSHI
        { token: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', typeId: '4' }, //UNI
    ]);
}

async function setTokensBCH(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0x3743eC0673453E5009310C727Ba4eaF7b3a1cc04', typeId: '3' }, //WBCH
    ]);
}

async function setTokensBSC(allowTokens) {
    await allowTokens.setMultipleTokens([
        { token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', typeId: '3' }, //WBNB
        { token: '0xe9e7cea3dedca5984780bafc599bd69add087d56', typeId: '5' }, //BUSD
        { token: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', typeId: '4' }, //CAKE
    ]);
}
