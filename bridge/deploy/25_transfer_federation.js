module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {log} = deployments

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const FederationProxy = await deployments.get('FederationProxy');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const multiSig = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);
    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

    const methodCall = bridge.methods.changeFederation(FederationProxy.address);
    await methodCall.call({ from: MultiSigWallet.address });
    await multiSig.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction Change Federation in the Bridge`);
};
module.exports.id = 'transfer_federation'; // id required to prevent reexecution
module.exports.tags = ['TransferFederation', 'new'];
//module.exports.dependencies = ['Federation', 'Bridge', 'BridgeProxy', 'MultiSigWallet'];
