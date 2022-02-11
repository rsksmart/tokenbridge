const chains = require("../hardhat/helper/chains");

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  // if we have the bridge proxy address
  // doesn't need to deploy a new SideTokenFactory
  // because most probably the sideTokenFactory already exists
  if (bridgeProxy) {
    return;
  }

  const deployResult = await deploy('SideTokenFactory', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract SideTokenFactory deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);

    if(network.live && !chains.isRSK(network)) {
      log(`Startig Verification of ${deployResult.address}`);
      await hre.run("verify:verify", {
        address: deployResult.address,
        constructorArguments: [],
      });
    }
  }
};
module.exports.id = 'deploy_sideTokenFactory'; // id required to prevent reexecution
module.exports.tags = ['SideTokenFactory', 'DeployFromScratch', 'IntegrationTest'];
