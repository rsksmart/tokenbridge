module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()
    const {log} = deployments

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const SideTokenFactory = await deployments.get('SideTokenFactory');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSig ?? MultiSigWallet.address);
    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

    const methodCall = bridge.methods.changeSideTokenFactory(SideTokenFactory.address);
    await methodCall.call({ from: multiSig ?? MultiSigWallet.address });
    await multiSigContract.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction Change SideTokenFactory in Bridge`);
};
module.exports.id = 'transfer_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'new'];
//module.exports.dependencies = ['SideTokenFactory', 'Bridge', 'BridgeProxy', 'MultiSigWallet'];
