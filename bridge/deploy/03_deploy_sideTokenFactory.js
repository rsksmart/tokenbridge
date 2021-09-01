module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    if (sideTokenFactory) return
    const deployResult = await deploy('SideTokenFactory', {
      from: deployer,
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract SideTokenFactory deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }

};
module.exports.id = 'deploy_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'new'];
module.exports.dependencies = ['BridgeProxy'];
