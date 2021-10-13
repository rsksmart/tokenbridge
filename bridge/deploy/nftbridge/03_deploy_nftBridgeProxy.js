const nftBridgeProxyName = 'NftBridgeProxy';
const sideNFTTokenFactoryName = 'SideNFTTokenFactory';
const utils = require('../../test/utils');
const chains = require('../../hardhat/helper/chains');
const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log, execute} = deployments

  const prefixSymbol = chains.tokenSymbol(network);

  const multiSigAddress = await address.getMultiSigAddress(hre);
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const federatorProxyAddress = await address.getFederatorProxyAddress(hre);
  const SideNFTTokenFactory = await deployments.get(sideNFTTokenFactoryName);

  const NFTBridge = await deployments.get('NFTBridge');
  const nftBridge = new web3.eth.Contract(NFTBridge.abi, NFTBridge.address);
  const methodCall = nftBridge.methods.initialize(
    multiSigAddress,
    federatorProxyAddress,
    utils.NULL_ADDRESS,
    SideNFTTokenFactory.address,
    prefixSymbol
  );
  await methodCall.call({ from: deployer }) // call to check if anything is broken

  const deployProxyResult = await deploy(nftBridgeProxyName, {
    from: deployer,
    contract: 'TransparentUpgradeableProxy',
    args: [
      NFTBridge.address,
      proxyAdminAddress,
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
module.exports.tags = [nftBridgeProxyName, 'nft', '3.0.0', 'IntegrationTestNft'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin', 'FederationProxy', sideNFTTokenFactoryName];
