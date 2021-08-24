const { deploy1820 } = require('@thinkanddev/deploy-eip-1820-web3-rsk')

module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('MultiSigWallet', {
      from: deployer,
      args: [
        [deployer],
        1
      ],
      log: true,
    });

    if (deployResult.newlyDeployed) {
      log(
        `Contract MultiSigWallet deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
      );
    }

    await deploy1820(web3);

};
module.exports.id = 'deploy_multiSigWallet'; // id required to prevent reexecution
module.exports.tags = ['MultiSigWallet'];
