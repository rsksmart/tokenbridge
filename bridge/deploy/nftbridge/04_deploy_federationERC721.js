const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;

  const deployResult = await deploy('Federation', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract Federation with set Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }

  const federationDeployment = await deployments.get('Federation');
  const proxyAdminDeployment = await deployments.get('ProxyAdmin');
  const nftBridgeProxyDeployment = await deployments.get('NftBridgeProxy');
  const federationProxyDeployment = await deployments.get('FederationProxy');
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');
  const multiSigAddress = await address.getMultiSigAddress(hre);

  const proxyAdminContract = new web3.eth.Contract(proxyAdminDeployment.abi, proxyAdminDeployment.address);
  const methodCallUpdagradeFederationDeployment = proxyAdminContract.methods.upgrade(federationProxyDeployment.address, federationDeployment.address);
  await methodCallUpdagradeFederationDeployment.call({ from: multiSigAddress });

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSigAddress);
  await multiSigContract.methods.submitTransaction(
    proxyAdminDeployment.address,
    0,
    methodCallUpdagradeFederationDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade FederationProxy contract in ProxyAdmin`);

  const federation = new web3.eth.Contract(federationDeployment.abi, federationProxyDeployment.address);
  const methodCallSetNftBridge = federation.methods.setNFTBridge(nftBridgeProxyDeployment.address);
  await methodCallSetNftBridge.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(federationProxyDeployment.address, 0, methodCallSetNftBridge.encodeABI())
    .send({ from: deployer });
  log(`MultiSig submitTransaction set the NFT Bridge in the Federator`);
};
module.exports.id = 'deploy_nft_federation'; // id required to prevent reexecution
module.exports.tags = ['FederationV3', 'nft', '3.0.0', 'IntegrationTestNft'];
module.exports.dependencies = ['Federation', 'ProxyAdmin', 'NftBridgeProxy', 'FederationProxy', 'MultiSigWallet'];
