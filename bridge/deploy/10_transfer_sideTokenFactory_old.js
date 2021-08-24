module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {log, execute} = deployments


    const BridgeProxy = await deployments.get('BridgeProxy');
    await execute('SideTokenFactory_old', {from: deployer}, 'transferPrimary', BridgeProxy.address);
    log(
        `Federation Transfered Primary to BridgeProxy`
    );
};
module.exports.id = 'transfer_sideTokenFactory_old'; // id required to prevent reexecution
module.exports.tags = ['TransferSideTokenFactory_old', 'old'];
module.exports.dependencies = ['SideTokenFactory_old', 'BridgeProxy'];
