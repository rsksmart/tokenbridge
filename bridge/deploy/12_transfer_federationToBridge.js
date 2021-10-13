const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, federatorProxy} = await getNamedAccounts();
  const {log} = deployments;

  if (federatorProxy) {
    return;
  }

  const BridgeV3 = await deployments.get('BridgeV3');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);
  const federationProxyAddress = await address.getFederatorProxyAddress(hre);
  const multiSigAddress =  await address.getMultiSigAddress(hre);

  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);
  const bridgeV3 = new web3.eth.Contract(BridgeV3.abi, bridgeProxyAddress);

  const methodCall = bridgeV3.methods.changeFederation(federationProxyAddress);
  await methodCall.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(bridgeProxyAddress, 0, methodCall.encodeABI()).send({ from: deployer });
  log(`MultiSig submitTransaction Change Federation in the Bridge`);
};
module.exports.id = 'transfer_federation_to_bridge'; // id required to prevent reexecution
module.exports.tags = ['TransferFederationToBridge', 'new', 'IntegrationTest'];
module.exports.dependencies = ['BridgeV3', 'BridgeProxy', 'FederationProxy', 'MultiSigWallet'];
