module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('Utils_old', {
      from: deployer,
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract Utils_old deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }
};
module.exports.id = 'deploy_utils_old'; // id required to prevent reexecution
module.exports.tags = ['Utils_old', 'old'];
