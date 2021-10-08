const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, allowTokensProxy} = await getNamedAccounts()
  const {log} = deployments

  if (allowTokensProxy) return

  const BridgeV3 = await deployments.get('BridgeV3');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const multiSigAddress =  await address.getMultiSigAddress(hre);
  const allowTokensAddress = await address.getAllowTokensProxyAddress(hre);
  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);

  const bridgeV3 = new web3.eth.Contract(BridgeV3.abi, bridgeProxyAddress);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);

  const methodCall = bridgeV3.methods.changeAllowTokens(allowTokensAddress);
  await methodCall.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(bridgeProxyAddress, 0, methodCall.encodeABI()).send({ from: deployer });
  log(`MultiSig submitTransaction changeAllowtokens to AllowTokens in the Bridge`);
};
module.exports.id = 'transfer_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['TransferAllowTokensToBridge', 'new'];
module.exports.dependencies = ['BridgeV3', 'BridgeProxy', 'AllowTokensProxy', 'MultiSigWallet'];
