module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log, execute} = deployments

    const deployResult = await deploy('SideTokenFactory', {
      from: deployer,
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract SideTokenFactory deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }

    const BridgeProxy = await deployments.get('BridgeProxy');
    await execute('SideTokenFactory', {from: deployer}, 'transferPrimary', BridgeProxy.address);
    log(
      `SideTokenFactory Transfered Primary to BridgeProxy`
    );
};
module.exports.id = 'deploy_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'new'];
module.exports.dependencies = ['BridgeProxy'];
