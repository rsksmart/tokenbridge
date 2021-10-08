module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) return;

  const deployResult = await deploy('Bridge', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_bridge'; // id required to prevent reexecution
module.exports.tags = ['Bridge', 'new', 'BridgeDeployment'];
