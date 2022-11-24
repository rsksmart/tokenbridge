const address = require('../hardhat/helper/address');
const chains = require('../hardhat/helper/chains');
const {web3} = require("hardhat");

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {deployments, network, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const FEDERATION_LAST_VERSION = 'v3'

  const federationProxyAddress = await address.getFederationProxyAddress(hre);
  if (federationProxyAddress) {
    const Federation = await deployments.getArtifact('Federation');
    const federation = new web3.eth.Contract(Federation.abi, federationProxyAddress);
    const currentFederationVersion = federation.methods.version().call();
    if (currentFederationVersion === FEDERATION_LAST_VERSION) {
      return;
    }
  }

  const deployResult = await deploy('Federation', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract Federation deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);

    if(network.live && !chains.isRSK(network)) {
      log(`Startig Verification of ${deployResult.address}`);
      await hre.run("verify:verify", {
        address: deployResult.address,
        constructorArguments: [],
      });
    }
  }
};
module.exports.id = 'deploy_federation'; // id required to prevent reexecution
module.exports.tags = ['Federation', 'Upgrade', 'DeployFromScratch', 'IntegrationTest'];
