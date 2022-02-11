const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, federationProxy} = await getNamedAccounts();
  const {log} = deployments;

  if (federationProxy) {
    return;
  }

  const Bridge = await deployments.getArtifact('Bridge');
  const MultiSigWallet = await deployments.getArtifact('MultiSigWallet');

  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);
  const federationProxyAddress = await address.getFederationProxyAddress(hre);
  const multiSigAddress =  await address.getMultiSigAddress(hre);

  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);
  const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxyAddress);

  const methodCall = bridge.methods.changeFederation(federationProxyAddress);
  await methodCall.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(bridgeProxyAddress, 0, methodCall.encodeABI()).send({ from: deployer });
  log(`MultiSig submitTransaction Change Federation in the Bridge`);
};
module.exports.id = 'transfer_federation_to_bridge'; // id required to prevent reexecution
module.exports.tags = ['TransferFederationToBridge', 'DeployFromScratch', 'IntegrationTest'];
module.exports.dependencies = ['Bridge', 'BridgeProxy', 'FederationProxy', 'MultiSigWallet'];
