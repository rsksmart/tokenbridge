module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  if (!network.live) {
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('NFTERC721TestToken', {
      from: deployer,
      args: ['The Drops', 'drop'],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(`Contract NFTERC721TestToken deployed at ${deployResult.address}`);
    }
  }
};
module.exports.id = 'deploy_nft_erc721_test_token'; // id required to prevent reexecution
module.exports.tags = ['ERC721', 'nft', '3.0.0', 'IntegrationTestNft'];
