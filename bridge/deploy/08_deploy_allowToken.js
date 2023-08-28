const address = require('../hardhat/helper/address');
const chains = require('../hardhat/helper/chains');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const ALLOW_TOKEN_LAST_VERSION = 'v2'

  const allowTokensProxyAddress = await address.getAllowTokensProxyAddress(hre);
  if (allowTokensProxyAddress) {
    const AllowTokens = await deployments.getArtifact('AllowTokens');
    const allowTokens = new web3.eth.Contract(AllowTokens.abi, allowTokensProxyAddress);
    const currentAllowTokensVersion = allowTokens.methods.version().call();
    if (currentAllowTokensVersion === ALLOW_TOKEN_LAST_VERSION) {
      return;
    }
  }

  const deployResult = await deploy('AllowTokensV1', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract AllowTokens deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);

    if(network.live && !chains.isRSK(network)) {
      log(`Startig Verification of ${deployResult.address}`);
      await hre.run("verify:verify", {
        address: deployResult.address,
        constructorArguments: [],
      });
    }
  }
};
module.exports.id = 'deploy_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['AllowTokens', 'DeployFromScratch', 'IntegrationTest'];
