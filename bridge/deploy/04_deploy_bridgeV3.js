module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) return;

  const deployResult = await deploy('BridgeV3', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract BridgeV3 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_bridge'; // id required to prevent reexecution
module.exports.tags = ['BridgeV3', 'new', 'BridgeDeployment', 'IntegrationTest'];
