module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig, wrappedCurrency, bridgeProxy} = await getNamedAccounts()
    const {deploy, log} = deployments

    if (bridgeProxy) return

    const deployResult = await deploy('Bridge', {
        from: deployer,
        log: true,
    });
    if (deployResult.newlyDeployed) {
        log(
            `Contract Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
        );
    }

    // We need the multisig to update the contract
    const MultiSigWallet = await deployments.get('MultiSigWallet');
    const Bridge = await deployments.get('Bridge');



    

};
module.exports.id = 'deploy_bridge'; // id required to prevent reexecution
module.exports.tags = ['Bridge', 'new'];
// module.exports.dependencies = [
//     'BridgeProxy',
//     'MultiSigWallet',
//     'ProxyAdmin',
//     'Federation',
//     'AllowTokens',
//     'SideTokenFactory',
//     'WrappedCurrency'
// ];
