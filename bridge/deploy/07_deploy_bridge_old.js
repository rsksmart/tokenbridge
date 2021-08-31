module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments
    const UtilsV1 = await deployments.get('UtilsV1');

    const deployResult = await deploy('BridgeV1', {
        from: deployer,
        libraries: {
            UtilsV1: UtilsV1.address
        },
        log: true,
    });

    if (deployResult.newlyDeployed) {
        log(
        `Contract BridgeV1 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
        );
    }
};
module.exports.id = 'deploy_bridge_v1'; // id required to prevent reexecution
module.exports.tags = ['BridgeV1', 'old'];
module.exports.dependencies = ['MultiSigWallet', 'UtilsV1'];
