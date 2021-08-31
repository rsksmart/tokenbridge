module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()
    const {log, execute} = deployments

    const BridgeProxy = await deployments.get('BridgeProxy');
    await execute('FederationV1', {from: deployer}, 'setBridge', BridgeProxy.address);
    log(
      `FederationV1 set Bridge to BridgeProxy`
    );

    const MultiSigWallet = await deployments.get('MultiSigWallet');
    await execute('FederationV1', {from: deployer}, 'transferOwnership', multiSig ?? MultiSigWallet.address);
    log(
      `FederationV1 Transfered Ownership to MultiSig`
    );
};
module.exports.id = 'transfer_federation_v1'; // id required to prevent reexecution
module.exports.tags = ['TransferFederationV1', 'old'];
module.exports.dependencies = ['FederationV1', 'BridgeProxy', 'MultiSigWallet'];
