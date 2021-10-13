module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts()
  const {deploy, log} = deployments

  const deployResult = await deploy('SideNFTTokenFactory', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract SideNFTTokenFactory deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_nft_side_token_factory'; // id required to prevent reexecution
module.exports.tags = ['SideNFTTokenFactory', 'nft', '3.0.0', 'IntegrationTestNft'];
