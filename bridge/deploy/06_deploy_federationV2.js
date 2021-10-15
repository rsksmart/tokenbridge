
module.exports = async function({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, federatorProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  // if we have the federator proxy address
  // doesn't need to deploy a new FederationV2
  // because most probably the FederationV2 already exists
  if (federatorProxy) return

  const deployResult = await deploy('FederationV2', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract FederationV2 deployedV2 at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_federation_v2'; // id required to prevent reexecution
module.exports.tags = ['FederationV2', 'new', 'IntegrationTest'];
