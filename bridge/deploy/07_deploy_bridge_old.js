module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments
    const UtilsV1 = await deployments.get('UtilsV1');

    const deployResult = await deploy('Bridge_old', {
        from: deployer,
        libraries: {
            UtilsV1: UtilsV1.address
        },
        log: true,
    });

    if (deployResult.newlyDeployed) {
        log(
        `Contract Bridge_old deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
        );
    }
};
module.exports.id = 'deploy_bridge_old'; // id required to prevent reexecution
module.exports.tags = ['Bridge_old', 'old'];
module.exports.dependencies = ['MultiSigWallet', 'UtilsV1'];
