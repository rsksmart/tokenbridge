const fs = require('fs');
const toWei = web3.utils.toWei;
const hardhatConfig = require('../../hardhat.config');
const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  if (network.name === 'soliditycoverage' || network.name === 'hardhat') {
    return;
  }
  const BridgeProxy = await deployments.get('BridgeProxy');
  const NftBridgeProxy = await deployments.get('NftBridgeProxy');
  const FederationProxy = await deployments.get('FederationProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const AllowTokensProxy = await deployments.get('AllowTokensProxy');
  const multiSigAddress = await address.getMultiSigAddress(hre);

  const config = {
    bridge: BridgeProxy.address.toLowerCase(),
    nftBridge: NftBridgeProxy.address.toLowerCase(),
    federation: FederationProxy.address.toLowerCase(),
    multiSig: multiSigAddress.toLowerCase(),
    allowTokens: AllowTokensProxy.address.toLowerCase(),
    nftConfirmations: 5
  };

  log(`New federation address: ${config.federation}`);

  if (!network.live) {
    const AllowTokensV1 = await deployments.get('AllowTokensV1');
    const allowTokensV1 = new web3.eth.Contract(AllowTokensV1.abi, AllowTokensProxy.address);
    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);

    const MainToken = await deployments.get('MainToken');
    config.testToken = MainToken.address.toLowerCase();
    let data = allowTokensV1.methods.addTokenType(
      'MAIN',
      {
        max:toWei('10000'),
        min:toWei('1'),
        daily:toWei('100000'),
        mediumAmount:toWei('2'),
        largeAmount:toWei('3')
      }
    ).encodeABI();
    await multiSigContract.methods.submitTransaction(AllowTokensProxy.address, 0, data).send({ from: deployer });
    log(`MultiSig submitTransaction addTokenType in the AllowTokens`);

    const typeId = 0;
    data = allowTokensV1.methods.setToken(MainToken.address, typeId).encodeABI();
    await multiSigContract.methods.submitTransaction(AllowTokensProxy.address, 0, data).send({ from: deployer });
    log(`MultiSig submitTransaction setToken MainToken in the AllowTokens`);
    // Uncomment below lines to use multiple federators
    // await multiSigContract.confirmTransaction(0).send({ from: accounts[1] });
    // await multiSigContract.confirmTransaction(0).send({ from: accounts[2] });
    const NFTERC721TestToken = await deployments.get('NFTERC721TestToken');
    config.testTokenNft = NFTERC721TestToken.address.toLowerCase();
  }
  const host = hardhatConfig.networks[network.name]?.url
  if (host) {
    config.host = host;
  } else {
    config.host = '';
  }
  config.fromBlock = await web3.eth.getBlockNumber();
  fs.writeFileSync(`../federator/config/${network.name}.json`, JSON.stringify(config, null, 4));
};
module.exports.id = 'create_config_file_v3'; // id required to prevent reexecution
module.exports.tags = ['CreateConfigFileV3', '3.0.0', 'nft'];
module.exports.dependencies = ['NftBridgeProxy', 'BridgeProxy', 'FederationV3', 'MultiSigWallet', 'AllowTokensV1'];
