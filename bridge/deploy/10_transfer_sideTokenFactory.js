module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, sideTokenFactory} = await getNamedAccounts()
    const {log} = deployments

    if (sideTokenFactory) return
      const BridgeProxy = await deployments.get('BridgeProxy');
      await execute('SideTokenFactory', {from: deployer}, 'transferPrimary', BridgeProxy.address);
      log(
        `SideTokenFactory Transfered Primary to BridgeProxy`
    );

};
module.exports.id = 'transfer_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'new'];
//module.exports.dependencies = ['SideTokenFactory', 'Bridge', 'BridgeProxy', 'MultiSigWallet'];
