module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()
    const {deploy, log} = deployments
    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const deployResult = await deploy('AllowTokens_old', {
      from: deployer,
      args: [multiSig ?? MultiSigWallet.address],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract deploy_allowTokens_old deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }
};
module.exports.id = 'deploy_allowTokens_old'; // id required to prevent reexecution
module.exports.tags = ['AllowTokens_old', 'old'];
module.exports.dependencies = ['MultiSigWallet'];
