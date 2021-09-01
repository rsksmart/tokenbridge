module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig, allowTokensProxy, bridgeProxy} = await getNamedAccounts()
    const {log} = deployments

    if (allowTokensProxy) return

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const AllowTokensProxy = await deployments.get('AllowTokensProxy');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const multiSigAddress =  multiSig ?? MultiSigWallet.address
    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);
    const allowTokensAddress = allowTokensProxy ?? AllowTokensProxy.address
    const bridgeProxyAddress = bridgeProxy ?? BridgeProxy.address
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxyAddress);

    const methodCall = bridge.methods.changeAllowtokens(allowTokensAddress);
    await methodCall.call({ from: multiSigAddress });
    await multiSigContract.methods.submitTransaction(bridgeProxyAddress, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction changeAllowtokens to AllowTokens in the Bridge`);

};
module.exports.id = 'transfer_allowTokens'; // id required to prevent reexecution
module.exports.tags = ['TransferAllowTokens', 'new'];
//module.exports.dependencies = ['AllowTokens', 'Bridge', 'BridgeProxy', 'MultiSigWallet'];
