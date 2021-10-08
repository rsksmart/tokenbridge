const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, wrappedCurrency, bridgeProxy} = await getNamedAccounts();
  const {log} = deployments;

  if (bridgeProxy) return;

  const BridgeV3 = await deployments.get('BridgeV3');
  const BridgeProxy = await deployments.get('BridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const multiSigAddress = await address.getMultiSigAddress(hre);
  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);
  const bridgeV3 = new web3.eth.Contract(BridgeV3.abi, bridgeProxyAddress);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);

  if (!network.live) {
    const WRBTC = await deployments.get('WRBTC');
    log(`Get deployed WRBTC at ${WRBTC.address}`);
    methodCall = bridgeV3.methods.setWrappedCurrency(WRBTC.address);
    await methodCall.call({ from: multiSigAddress })
    await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);

    const AllowTokensV1 = await deployments.get('AllowTokensV1');
    const AllowTokensProxy = await deployments.get('AllowTokensProxy');
    const allowTokensV1 = new web3.eth.Contract(AllowTokensV1.abi, AllowTokensProxy.address);
    methodCall = allowTokensV1.methods.setToken(WRBTC.address, '0');
    await methodCall.call({ from: multiSigAddress });
    await multiSigContract.methods.submitTransaction(AllowTokensProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction set token WRBTC in AllowTokens`);
  } else {
    methodCall = bridgeV3.methods.setWrappedCurrency(wrappedCurrency);
    await methodCall.call({ from: multiSigAddress });
    await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);
  }
  methodCall = bridgeV3.methods.initDomainSeparator();
  await methodCall.call({ from: multiSigAddress });
  await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
  log(`MultiSig submitTransaction init Domain Separator in the Bridge`);

};
module.exports.id = 'set_bridge_wrapped_currency'; // id required to prevent reexecution
module.exports.tags = ['BridgeSetWrappedCurrency', 'new'];
module.exports.dependencies = ['AllowTokensProxy', 'AllowTokensV1', 'BridgeV3', 'BridgeProxy', 'MultiSigWallet', 'TransferAllowTokensToBridge', 'TransferFederationToBridge', 'SideTokenFactoryToBridge'];
