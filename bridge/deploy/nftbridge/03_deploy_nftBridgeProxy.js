const nftBridgeProxyName = 'NftBridgeProxy';
const utils = require('../../test/utils');

module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin, federatorProxy} = await getNamedAccounts()
  const {deploy, log} = deployments

  let symbolPrefix = 'e';
  if (network.name == 'rskregtest' || network.name == 'rsktestnet' || network.name == 'rskmainnet') {
    symbolPrefix = 'r'
  }

  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const ProxyAdmin = await deployments.get('ProxyAdmin');
  const FederationProxy = await deployments.get('FederationProxy')
  const SideNFTTokenFactory = await deployments.get('SideNFTTokenFactory');

  const NFTBridge = await deployments.get('NFTBridge');
  const nftBridge = new web3.eth.Contract(NFTBridge.abi, NFTBridge.address);
  const methodCall = nftBridge.methods.initialize(
    multiSig ?? MultiSigWallet.address,
    federatorProxy ?? FederationProxy.address,
    utils.NULL_ADDRESS,
    SideNFTTokenFactory.address,
    symbolPrefix
  );
  await methodCall.call({ from: deployer }) // call to check if anything is broken

  const deployProxyResult = await deploy(nftBridgeProxyName, {
    from: deployer,
    contract: 'TransparentUpgradeableProxy',
    args: [
      NFTBridge.address,
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
module.exports.tags = [nftBridgeProxyName, 'nft', '3.0.0'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin', 'FederationProxy', 'SideNFTTokenFactory'];
