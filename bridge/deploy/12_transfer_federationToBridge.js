module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig, federationAddressProxy, bridgeProxy} = await getNamedAccounts()
    const {log} = deployments

    if (federationAddressProxy) return

    const Bridge = await deployments.get('Bridge');
    const BridgeProxy = await deployments.get('BridgeProxy');
    const FederationProxy = await deployments.get('FederationProxy');
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const bridgeProxyAddress = bridgeProxy ?? BridgeProxy.address
    const federationProxyAddress = federationAddressProxy ?? FederationProxy.address
    const multiSigAddress =  multiSig ?? MultiSigWallet.address

    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSigAddress);
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxyAddress);

    const methodCall = bridge.methods.changeFederation(federationProxyAddress);
    await methodCall.call({ from: multiSigAddress });
    await multiSigContract.methods.submitTransaction(bridgeProxyAddress, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction Change Federation in the Bridge`);
};
module.exports.id = 'transfer_federation_to_bridge'; // id required to prevent reexecution
module.exports.tags = ['TransferFederationToBridge', 'new'];
module.exports.dependencies = ['Bridge', 'BridgeProxy', 'FederationProxy', 'MultiSigWallet'];
