module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('Federation_old', {
      from: deployer,
      args: [
        [deployer],
        1
      ],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract Federation_old deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }
};
module.exports.id = 'deploy_federation_old'; // id required to prevent reexecution
module.exports.tags = ['Federation_old', 'old'];
