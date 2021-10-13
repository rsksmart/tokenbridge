const chains = require("../hardhat/helper/chains");
const address = require('../hardhat/helper/address');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, allowTokensProxy} = await getNamedAccounts();
  const {log} = deployments;

  if (allowTokensProxy) {
    return;
  }

  const AllowTokensV1 = await deployments.get('AllowTokensV1');
  const AllowTokensProxy = await deployments.get('AllowTokensProxy');
  const allowTokensV1 = new web3.eth.Contract(AllowTokensV1.abi, AllowTokensProxy.address);
  const multiSigAddress = await address.getMultiSigAddress(hre);

  const owner = await allowTokensV1.methods.owner().call({from: deployer});
  if (owner === multiSigAddress) {
    return
  }

  await setTokens(network, allowTokensV1, deployer);
  log(`AllowTokens Setted Tokens`);

  // Set multisig as the owner
  await allowTokensV1.methods.transferOwnership(multiSigAddress).send({from: deployer});
  log(`AllowTokens Transfered Ownership to MultiSigWallet`);
};
module.exports.id = 'transfer_set_tokens_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['AllowTokensProxyTransferSetTokens', 'new', 'IntegrationTest'];
module.exports.dependencies = ['MultiSigWallet', 'AllowTokensV1', 'AllowTokensProxy'];

async function setTokens(network, allowTokens, deployer) {
  const chainID = network.config.network_id;

  switch (chainID) {
    case chains.BSC_TEST_NET_CHAIN_ID:
      await setTokensBscTestnet(allowTokens, deployer);
      break;

    case chains.RSK_TEST_NET_CHAIN_ID:
      await setTokensRskTestnet(allowTokens, deployer);
      break;

    case chains.KOVAN_TEST_NET_CHAIN_ID:
      await setTokensKovan(allowTokens, deployer);
      break;

    case chains.RSK_MAIN_NET_CHAIN_ID:
      await setTokensRskMainnet(allowTokens, deployer);
      break;

    case chains.ETHEREUM_MAIN_NET_CHAIN_ID:
      await setTokensEthereum(allowTokens, deployer);
      break;
  }
}

async function setTokensRskTestnet(allowTokens, deployer) {
  // await allowTokens.setToken('0x09b6ca5e4496238a1f176aea6bb607db96c2286e', '0'); //WRBTC
  await allowTokens.methods.setMultipleTokens([
    {token: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', typeId: '5'}, //RIF
    {token: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', typeId: '4'}, //DOC
    {token: '0x4da7997a819bb46b6758b9102234c289dd2ad3bf', typeId: '0'}, //BPro
    // SideToken
    {token: '0xd15cdd74dff1a6a81ca639b038839b126bc01ff9', typeId: '1'}, //rKovWETH
    {token: '0x0d86fca9be034a363cf12c9834af08d54a10451c', typeId: '4'}, //rKovSAI
    {token: '0x7b846216a194c69bb1ea52ea8faa92d314866451', typeId: '4'}, //rKovDAI
    {token: '0x0a8d098e31a60da2b9c874d97de6e6b385c28e9d', typeId: '4'}, //rKovTUSD
    {token: '0xed3334adb07a3a5947d268e5a8c67b84f5464963', typeId: '4'}, //rKovUSDC
    {token: '0x4cfE225cE54c6609a525768b13F7d87432358C57', typeId: '4'}, //rKovUSDT
    {token: '0x8bbbd80981fe76d44854d8df305e8985c19f0e78', typeId: '3'}, //rKovLINK
    {token: '0xe95afdfec031f7b9cd942eb7e60f053fb605dfcd', typeId: '3'} //rKovsBUND
  ]).send({from: deployer});
}

async function setTokensKovan(allowTokens, deployer) {
  await allowTokens.methods.setMultipleTokens([
    {token: '0xd1b98b6607330172f1d991521145a22bce793277', typeId: '0'}, //WBTC
    {token: '0x0a9add98c076448cbcfacf5e457da12ddbef4a8f', typeId: '0'}, //renBTC
    {token: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', typeId: '1'}, //WETH
    {token: '0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', typeId: '4'}, //SAI
    {token: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', typeId: '4'}, //DAI
    {token: '0x0000000000085d4780B73119b644AE5ecd22b376', typeId: '4'}, //TUSD
    {token: '0xe22da380ee6B445bb8273C81944ADEB6E8450422', typeId: '4'}, //USDC
    {token: '0x13512979ade267ab5100878e2e0f485b568328a4', typeId: '4'}, //USDT
    {token: '0xa36085F69e2889c224210F603D836748e7dC0088', typeId: '3'}, //LINK
    {token: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '3'}, //BUND
    // SideToken
    {token: '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', typeId: '5'}, //eRIF
    {token: '0x09a8f2041Be23e8eC3c72790C9A92089BC70FbCa', typeId: '4'}, //eDOC
    {token: '0xB3c9ec8833bfA0d382a183EcED27aBc079520928', typeId: '0'} //eBPro
  ]).send({from: deployer});
}

async function setTokensBscTestnet(allowTokens, deployer) {
  await allowTokens.methods.setMultipleTokens([
    {token: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8', typeId: '0'}, //BTC
    {token: '0x8babbb98678facc7342735486c851abd7a0d17ca', typeId: '1'}, //ETH
    {token: '0xae13d989dac2f0debff460ac112a837c89baa7cd', typeId: '2'}, //BNB
    {token: '0x5d47b6e7edfc82e2ecd481b3db70d0f6600fdef8', typeId: '4'}, //USDC
    {token: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd', typeId: '4'}, //USDT
    {token: '0x110887fc420292dce51c08504cee377872d0db66', typeId: '4'}, //BUSD
    {token: '0x13878644c0f2c9c5c8a85da43ebc3bb74bbc05a9', typeId: '4'}, //DAI
  ]).send({from: deployer});
}

async function setTokensRskMainnet(allowTokens, deployer) {
  await allowTokens.methods.setMultipleTokens([
    {token: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db', typeId: '5'}, //DOC
    {token: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', typeId: '6'}, //RIF
    // await allowTokens.setToken('0x440cd83c160de5c96ddb20246815ea44c7abbca8', '0'); //BPro
    // await allowTokens.setToken('0x967f8799af07df1534d48a95a5c9febe92c53ae0', '0'); //WRBTC
    // Side Tokens
    {token: '0x6b1a73d547f4009a26b8485b63d7015d248ad406', typeId: '4'}, //rDAI
    {token: '0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4', typeId: '4'}, //rUSDC
    {token: '0xef213441a85df4d7acbdae0cf78004e1e486bb96', typeId: '4'}, //rUSDT
    {token: '0x14adae34bef7ca957ce2dde5add97ea050123827', typeId: '3'}, //rLINK
    {token: '0x4991516df6053121121274397a8c1dad608bc95b', typeId: '3'}, //rBUND
    {token: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '6'}, //rFLIXX
    {token: '0x9c3a5f8d686fade293c0ce989a62a34408c4e307', typeId: '6'}, //rRFOX
    {token: '0xff9ea341d9ea91cb7c54342354377f5104fd403f', typeId: '6'} //rAMLT
  ]).send({from: deployer});
}

async function setTokensEthereum(allowTokens, deployer) {
  await allowTokens.methods.setMultipleTokens([
    {token: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', typeId: '0'}, //WBTC
    {token: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', typeId: '0'}, //renBTC
    {token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', typeId: '1'}, //WETH
    {token: '0x6b175474e89094c44da98b954eedeac495271d0f', typeId: '4'}, //DAI
    {token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', typeId: '5'}, //USDC
    {token: '0xdac17f958d2ee523a2206206994597c13d831ec7', typeId: '5'}, //USDT
    {token: '0x514910771af9ca656af840dff83e8264ecf986ca', typeId: '3'}, //LINK
    {token: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '3'}, //BUND
    {token: '0xf04a8ac553fcedb5ba99a64799155826c136b0be', typeId: '6'}, //FLIXX
    {token: '0xa1d6Df714F91DeBF4e0802A542E13067f31b8262', typeId: '6'}, //RFOX
    {token: '0xca0e7269600d353f70b14ad118a49575455c0f2f', typeId: '6'}, //AMLT
    // Side Tokens
    {token: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '5'}, //eRIF
    {token: '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', typeId: '4'} //eDOC
  ]).send({from: deployer});
}
