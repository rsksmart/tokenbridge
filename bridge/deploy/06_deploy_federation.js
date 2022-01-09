const address = require('../hardhat/helper/address');
const chains = require('../hardhat/helper/chains');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {deployments, network} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const FEDERATION_LAST_VERSION = 'v3'

  const federatorProxyAddress = await address.getFederatorProxyAddress(hre);
  if (federatorProxyAddress) {
    const Federation = await deployments.get('Federation');
    const federation = new web3.eth.Contract(Federation.abi, federatorProxyAddress);
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

    if(network.live && !chains.isRSK(network.config.network_id)) {
      log(`Startig Verification of ${deployResult.address}`);
      await hre.run("verify:verify", {
        address: deployResult.address,
        constructorArguments: [],
      });
    }
  }
};
module.exports.id = 'deploy_federation'; // id required to prevent reexecution
module.exports.tags = ['Federation', 'new', 'IntegrationTest'];
