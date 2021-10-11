module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;

  const deployResult = await deploy('WBNB', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract WBNB deployed at ${deployResult.address}`);
  }
};
module.exports.id = 'deploy_WBNB'; // id required to prevent reexecution
module.exports.tags = ['WBNB'];
