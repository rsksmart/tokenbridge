const {deploy1820} = require('@thinkanddev/deploy-eip-1820-web3-rsk');

module.exports = async function({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (multiSig) return;

  const deployResult = await deploy('MultiSigWallet', {
    from: deployer,
    args: [[deployer], 1],
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(`Contract MultiSigWallet deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }

  if (!network.live) {
    await deploy1820(web3);
  }
};
module.exports.id = 'deploy_multiSigWallet'; // id required to prevent re-execution
module.exports.tags = ['MultiSigWallet', 'IntegrationTest'];
