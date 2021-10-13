module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  // if we have the bridge proxy address
  // doesn't need to deploy a new SideTokenFactory
  // because most probably the sideTokenFactory already exists
  if (bridgeProxy) return;

  const deployResult = await deploy('SideTokenFactory', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract SideTokenFactory deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'new', 'IntegrationTest'];
