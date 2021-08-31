module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('FederationV1', {
      from: deployer,
      args: [
        [deployer],
        1
      ],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract FederationV1 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }
};
module.exports.id = 'deploy_federation_v1'; // id required to prevent reexecution
module.exports.tags = ['FederationV1', 'old'];
