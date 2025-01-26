const address = require('../hardhat/helper/address');
const chains = require('../hardhat/helper/chains');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {deployments, network} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const FEDERATION_LAST_VERSION = 'v2'

  const federationProxyAddress = await address.getFederationProxyAddress(hre);
  if (federationProxyAddress) {
    const Federation = await deployments.getArtifact('FederationV3');
    const federation = new web3.eth.Contract(Federation.abi, federationProxyAddress);
    const currentFederationVersion = federation.methods.version().send();
    if (currentFederationVersion === FEDERATION_LAST_VERSION) {
      return;
    }
  }

  const deployResult = await deploy('FederationV3', {
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
module.exports.tags = ['FederationV3', 'Upgrade', 'DeployFromScratch', 'IntegrationTest'];
