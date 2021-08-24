module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {log, execute} = deployments

    const BridgeProxy = await deployments.get('BridgeProxy');
    await execute('Federation_old', {from: deployer}, 'setBridge', BridgeProxy.address);
    log(
      `Federation_old set Bridge to BridgeProxy`
    );

    const MultiSigWallet = await deployments.get('MultiSigWallet');
    await execute('Federation_old', {from: deployer}, 'transferOwnership', MultiSigWallet.address);
    log(
      `Federation_old Transfered Ownership to MultiSig`
    );
};
module.exports.id = 'transfer_federation_old'; // id required to prevent reexecution
module.exports.tags = ['TransferFederation_old', 'old'];
module.exports.dependencies = ['Federation_old', 'BridgeProxy', 'MultiSigWallet'];
