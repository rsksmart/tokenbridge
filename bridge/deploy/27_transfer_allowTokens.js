module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()
    const {log} = deployments

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const AllowTokensProxy = await deployments.get('AllowTokensProxy');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSig ?? MultiSigWallet.address);
    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

    const methodCall = bridge.methods.changeAllowTokens(AllowTokensProxy.address);
    await methodCall.call({ from: multiSig ?? MultiSigWallet.address });
    await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction Change AllowTokens in the Bridge`);
};
module.exports.id = 'transfer_allowTokens'; // id required to prevent reexecution
module.exports.tags = ['TransferAllowTokens', 'new'];
//module.exports.dependencies = ['AllowTokens', 'Bridge', 'BridgeProxy', 'MultiSigWallet'];
