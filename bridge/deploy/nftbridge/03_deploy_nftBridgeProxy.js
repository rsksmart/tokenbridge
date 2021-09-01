const nftBridgeProxyName = 'NftBridgeProxy';
const sideNFTTokenFactoryName = 'SideNFTTokenFactory';
const utils = require('../../test/utils');

module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin, federatorProxy} = await getNamedAccounts()
  const {deploy, log, execute} = deployments

  let symbolPrefix = 'e';
  if (network.name === 'rskregtest' || network.name === 'rsktestnet' || network.name === 'rskmainnet') {
    symbolPrefix = 'r'
  }

  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const ProxyAdmin = await deployments.get('ProxyAdmin');
  const FederationProxy = await deployments.get('FederationProxy')
  const SideNFTTokenFactory = await deployments.get(sideNFTTokenFactoryName);

  const NFTBridge = await deployments.get('NFTBridge');
  const nftBridge = new web3.eth.Contract(NFTBridge.abi, NFTBridge.address);
  let multiSigAddress = multiSig ?? MultiSigWallet.address;
  const methodCall = nftBridge.methods.initialize(
    multiSigAddress,
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

  // TODO: add NFTBridgeProxy addresses to hardhat config once it's deployed - and use it here.
  const NftBridgeProxy = await deployments.get(nftBridgeProxyName); // TODO: maybe there's a more elegant way.
  await execute(sideNFTTokenFactoryName, {from: deployer}, 'transferPrimary', NftBridgeProxy.address);
  log(`${sideNFTTokenFactoryName} transferred primary ownership to ${nftBridgeProxyName}`);
};
module.exports.id = 'deploy_nft_bridge_proxy'; // id required to prevent re-execution
module.exports.tags = [nftBridgeProxyName, 'nft', '3.0.0'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin', 'FederationProxy', sideNFTTokenFactoryName];
