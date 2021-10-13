module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer} = await getNamedAccounts()
  const {deploy, log} = deployments

  const deployResult = await deploy('NFTBridge', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract NFT Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_nft_bridge'; // id required to prevent reexecution
module.exports.tags = ['NftBridge', 'nft', '3.0.0', 'IntegrationTestNft'];
