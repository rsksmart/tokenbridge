module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment

    if (!network.live) {
        const {deployer} = await getNamedAccounts()
        const {deploy, log} = deployments

        const deployResult = await deploy('WRBTC', {
        from: deployer,
        log: true,
        });

        if (deployResult.newlyDeployed) {
        log(
            `Contract WRBTC deployed at ${deployResult.address}`
        );
        }
    }
};
module.exports.id = 'deploy_WRBTC'; // id required to prevent reexecution
module.exports.tags = ['WRBTC'];
