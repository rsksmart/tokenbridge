module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (network.live) return;

  const deployResult = await deploy('WRBTC', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract WRBTC deployed at ${deployResult.address}`);
  }
};
module.exports.id = 'deploy_WRBTC'; // id required to prevent reexecution
module.exports.tags = ['WRBTC', 'IntegrationTest'];
