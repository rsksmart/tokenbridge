module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig, proxyAdmin} = await getNamedAccounts()
    const {deploy, log} = deployments

    let symbol = 'e';
    if(network.name == 'rskregtest' || network.name == 'rsktestnet' || network.name == 'rskmainnet')
        symbol = 'r'

    const MultiSigWallet = await deployments.get('MultiSigWallet');
    const ProxyAdmin = await deployments.get('ProxyAdmin');
    const Federation_old = await deployments.get('Federation_old');
    const AllowTokens_old = await deployments.get('AllowTokens_old');
    const SideTokenFactory_old = await deployments.get('SideTokenFactory_old');

    const Bridge_old = await deployments.get('Bridge_old');
    const bridge = new web3.eth.Contract(Bridge_old.abi, Bridge_old.address);
    const methodCall = bridge.methods.initialize(
        multiSig ?? MultiSigWallet.address,
        Federation_old.address,
        AllowTokens_old.address,
        SideTokenFactory_old.address,
        symbol
    );
    await methodCall.call({ from: deployer })

    const deployProxyResult = await deploy('BridgeProxy', {
        from: deployer,
        args: [
            Bridge_old.address,
            proxyAdmin ?? ProxyAdmin.address,
            methodCall.encodeABI()
        ],
        log: true,
    });
    if (deployProxyResult.newlyDeployed) {
        log(
            `Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`
        );
    }
};
module.exports.id = 'deploy_bridgeProxy'; // id required to prevent reexecution
module.exports.tags = ['BridgeProxy', 'old'];
module.exports.dependencies = ['Bridge_old', 'MultiSigWallet', 'ProxyAdmin','Federation_old', 'AllowTokens_old', 'SideTokenFactory_old'];
