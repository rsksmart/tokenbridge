module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, wrappedCurrency} = await getNamedAccounts()
    const {deploy, log} = deployments

    const deployResult = await deploy('Bridge', {
        from: deployer,
        log: true,
    });
    if (deployResult.newlyDeployed) {
        log(
            `Contract Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
        );
    }

    const BridgeProxy = await deployments.get('BridgeProxy');
    // We need the multisig to update the contract
    const MultiSigWallet = await deployments.get('MultiSigWallet');
    // We deploy the contract manually and point the proxy to the new logic
    const ProxyAdmin = await deployments.get('ProxyAdmin');
    const Bridge = await deployments.get('Bridge');

    const proxyAdmin = new web3.eth.Contract(ProxyAdmin.abi, ProxyAdmin.address);
    let methodCall = proxyAdmin.methods.upgrade(BridgeProxy.address, Bridge.address);
    // do a call first to see if it's successful
    await methodCall.call({ from: MultiSigWallet.address });

    const multiSig = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);
    await multiSig.methods.submitTransaction(
        ProxyAdmin.address,
        0,
        methodCall.encodeABI(),
    ).send({ from: deployer });
    log(`MultiSig submitTransaction upgrade BridgeProxy contract in ProxyAdmin`);

    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
    if (!network.live) {
        const WRBTC = await deployments.get('WRBTC');
        log(`Get deployed WRBTC at ${WRBTC.address}`);
        methodCall = bridge.methods.setWrappedCurrency(WRBTC.address);
        await methodCall.call({ from: MultiSigWallet.address })
        await multiSig.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
        log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);

        const AllowTokens = await deployments.get('AllowTokens');
        const AllowTokensProxy = await deployments.get('AllowTokensProxy');
        const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);
        methodCall = allowTokens.methods.setToken(WRBTC.address, '0');
        await methodCall.call({ from: MultiSigWallet.address })
        await multiSig.methods.submitTransaction(AllowTokensProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
        log(`MultiSig submitTransaction set token WRBTC in AllowTokens`);
    } else {
        methodCall = bridge.methods.setWrappedCurrency(wrappedCurrency);
        await methodCall.call({ from: MultiSigWallet.address });
        await multiSig.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
        log(`MultiSig submitTransaction set Wrapped Currency in the Bridge`);
    }
    methodCall = bridge.methods.initDomainSeparator();
    await methodCall.call({ from: MultiSigWallet.address });
    await multiSig.methods.submitTransaction(BridgeProxy.address, 0, methodCall.encodeABI()).send({ from: deployer });
    log(`MultiSig submitTransaction init Domain Separator in the Bridge`);

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
