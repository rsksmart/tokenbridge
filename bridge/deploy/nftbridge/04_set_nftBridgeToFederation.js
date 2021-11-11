const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  const federationV4Deployment = await deployments.get('Federation');
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');
  const nftBridgeProxyDeployment = await deployments.get('NftBridgeProxy');
  const federationProxyDeployment = await deployments.get('FederationProxy');
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSigAddress);


  const federation = new web3.eth.Contract(federationV4Deployment.abi, federationProxyDeployment.address);
  const methodCallGetNftBridge = await federation.methods.bridgeNFT();
  const federationNftBridgeAddr = await methodCallGetNftBridge.call({ from: multiSigAddress });

  if (federationNftBridgeAddr === nftBridgeProxyDeployment.address) {
    log(`Federation already have the correct address of nft bridge`);
    return;
  }

  const methodCallSetNftBridge = federation.methods.setNFTBridge(nftBridgeProxyDeployment.address);
  await methodCallSetNftBridge.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(federationProxyDeployment.address, 0, methodCallSetNftBridge.encodeABI())
    .send({ from: deployer });
  log(`MultiSig submitTransaction set the NFT Bridge in the Federator`);
};
module.exports.id = 'deploy_nft_federation'; // id required to prevent reexecution
module.exports.tags = ['SetNftBridge', 'nft', '3.0.0', 'IntegrationTestNft'];
module.exports.dependencies = ['ProxyAdmin', 'NftBridgeProxy', 'FederationProxy', 'MultiSigWallet'];
