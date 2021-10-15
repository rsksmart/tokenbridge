module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    if (network.live) return;

    const deployResult = await deploy('MainToken', {
      from: deployer,
      args: [
        'MAIN',
        'MAIN',
        18,
        web3.utils.toWei('1000')
      ],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(`Contract MainToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
    }
};
module.exports.id = 'deploy_main_token'; // id required to prevent reexecution
module.exports.tags = ['MainToken', 'test', 'IntegrationTest'];
