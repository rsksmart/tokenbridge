module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer} = await getNamedAccounts()
    const {deploy, log} = deployments
    const Utils_old = await deployments.get('Utils_old');

    const deployResult = await deploy('Bridge_old', {
        from: deployer,
        libraries: {
            Utils_old: Utils_old.address
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
module.exports.dependencies = ['MultiSigWallet', 'Utils_old'];
