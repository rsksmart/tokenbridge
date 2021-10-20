const address = require('../hardhat/helper/address');

module.exports = async function({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const ALLOW_TOKEN_LAST_VERSION = 'v2'

  const allowTokensProxyAddress = await address.getAllowTokensProxyAddress(hre);
  if (allowTokensProxyAddress) {
    const AllowTokens = await deployments.get('AllowTokens');
    const allowTokens = new web3.eth.Contract(AllowTokens.abi, allowTokensProxyAddress);
    const currentAllowTokensVersion = allowTokens.methods.version().call();
    if (currentAllowTokensVersion === ALLOW_TOKEN_LAST_VERSION) {
      return;
    }
  }

  const deployResult = await deploy('AllowTokens', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract AllowTokens deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['AllowTokens', 'new', 'IntegrationTest'];
