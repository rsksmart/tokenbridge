module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;

  // if (network.live) return;

  const initialSupply =  web3.utils.toWei('15000000000000000000000'); // value in wei

  const deployResult = await deploy('WTBTC', {
    from: deployer,
    args: [initialSupply],
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract WTBTC deployed at ${deployResult.address}`);
  }
};
module.exports.id = 'deploy_WTBTC'; // id required to prevent reexecution
module.exports.tags = ['WTBTC'];
