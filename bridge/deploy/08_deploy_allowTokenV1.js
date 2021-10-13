module.exports = async function({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, allowTokensProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (allowTokensProxy) {
    return;
  }

  const deployResult = await deploy('AllowTokensV1', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract AllowTokens V1 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['AllowTokensV1', 'new', 'IntegrationTest'];