module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;

  const WRBTC = await deployments.get('WRBTC');

  const deployResult = await deploy('CallWrbtc', {
    from: deployer,
    log: true,
    args: [WRBTC.address]
  });

  if (deployResult.newlyDeployed) {
    log(`Contract CallWrbtc deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas with arguments: ${WRBTC.address}`);
  }
};
module.exports.id = 'deploy_CallWrbtc'; // id required to prevent reexecution
module.exports.tags = ['CallWrbtc'];
