module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig, wrappedCurrency, bridgeProxy} = await getNamedAccounts();
    const {log} = deployments;

    if (bridgeProxy) return;

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const multiSigAddress = multiSig ?? MultiSigWallet.address
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxy ?? BridgeProxy.address);
    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);

    if (!network.live) {
      const WRBTC = await deployments.get('WRBTC');
      log(`Get deployed WRBTC at ${WRBTC.address}`);
      methodCall = bridge.methods.setWrappedCurrency(WRBTC.address);
      await methodCall.call({ from: multiSigAddress })
      await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
      log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);

      const AllowTokens = await deployments.get('AllowTokens');
      const AllowTokensProxy = await deployments.get('AllowTokensProxy');
      const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);
      methodCall = allowTokens.methods.setToken(WRBTC.address, '0');
      await methodCall.call({ from: multiSigAddress })
      await multiSigContract.methods.submitTransaction(AllowTokensProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
      log(`MultiSig submitTransaction set token WRBTC in AllowTokens`);
    } else {
      methodCall = bridge.methods.setWrappedCurrency(wrappedCurrency);
      await methodCall.call({ from: multiSigAddress });
      await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
      log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);
    }
    methodCall = bridge.methods.initDomainSeparator();
    await methodCall.call({ from: multiSigAddress });
    await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction init Domain Separator in the Bridge`);

};
module.exports.id = 'set_bridge_wrapped_currency'; // id required to prevent reexecution
module.exports.tags = ['BridgeSetWrappedCurrency', 'new'];
module.exports.dependencies = ['AllowTokensProxy', 'AllowTokens', 'Bridge', 'BridgeProxy', 'MultiSigWallet', 'TransferAllowTokensToBridge', 'TransferFederationToBridge', 'SideTokenFactoryToBridge'];
