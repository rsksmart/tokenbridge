const nftBridgeProxyName = 'NftBridgeProxy';
const utils = require('../../test/utils');

module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin} = await getNamedAccounts()
  const {deploy, log} = deployments

  let symbolPrefix = 'e';
  if (network.name == 'rskregtest' || network.name == 'rsktestnet' || network.name == 'rskmainnet') {
    symbolPrefix = 'r'
  }

  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const ProxyAdmin = await deployments.get('ProxyAdmin');
  const FederationProxy = await deployments.get('FederationProxy')
  const SideTokenFactory = await deployments.get('SideNFTTokenFactory');

  const nftBridge = await deployments.get('NFTBridge');
  const bridge = new web3.eth.Contract(nftBridge.abi, nftBridge.address);
  const methodCall = bridge.methods.initialize(
    multiSig ?? MultiSigWallet.address,
    FederationProxy.address,
    utils.NULL_ADDRESS,
    SideTokenFactory.address,
    symbolPrefix
  );
  await methodCall.call({ from: deployer }) // call to check if anything is broken

  const deployProxyResult = await deploy(nftBridgeProxyName, {
    from: deployer,
    contract: 'TransparentUpgradeableProxy',
    args: [
      nftBridge.address,
      proxyAdmin ?? ProxyAdmin.address,
      methodCall.encodeABI()
    ],
    log: true,
  });

  if (deployProxyResult.newlyDeployed) {
    log(`Contract ${nftBridgeProxyName} deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_nft_bridge_proxy'; // id required to prevent reexecution
module.exports.tags = [nftBridgeProxyName, 'nft', '1.0.0'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin', 'FederationProxy','SideNFTTokenFactory'];
