module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {log, execute} = deployments


    const BridgeProxy = await deployments.get('BridgeProxy');
    await execute('SideTokenFactoryV1', {from: deployer}, 'transferPrimary', BridgeProxy.address);
    log(
        `Federation Transfered Primary to BridgeProxy`
    );
};
module.exports.id = 'transfer_sideTokenFactory_v1'; // id required to prevent reexecution
module.exports.tags = ['TransferSideTokenFactoryV1', 'old'];
module.exports.dependencies = ['SideTokenFactoryV1', 'BridgeProxy'];
