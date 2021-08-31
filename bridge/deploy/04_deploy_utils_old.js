module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('UtilsV1', {
      from: deployer,
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract UtilsV1 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }
};
module.exports.id = 'deploy_utils_v1'; // id required to prevent reexecution
module.exports.tags = ['UtilsV1', 'old'];
