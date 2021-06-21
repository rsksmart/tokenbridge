const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const WRBTC = artifacts.require("WRBTC");
const AllowTokens = artifacts.require('AllowTokens');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(Bridge);
    const bridgeLogic = await Bridge.deployed();
    deployedJson.Bridge = bridgeLogic.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);

    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);

    // We need the multisig to update the contract
    // We deploy the contract manually and point the proxy to the new logic
    const proxyAdmin = await ProxyAdmin.at(deployedJson.ProxyAdmin);

    let methodCall = proxyAdmin.contract.methods.upgrade(deployedJson.BridgeProxy, deployedJson.Bridge);
    await methodCall.call({from:deployedJson.MultiSig})
    await multiSig.submitTransaction(proxyAdmin.address, 0, methodCall.encodeABI(), { from: accounts[0] });

    const bridge = await Bridge.at(deployedJson.BridgeProxy);
    if (deployHelper.isLocalNetwork(networkName)) {
        await deployer.deploy(WRBTC);
        const wrbtc = await WRBTC.deployed();
        deployedJson.WrappedCurrency = wrbtc.address.toLowerCase();
        deployHelper.saveDeployed(deployedJson);

        methodCall = bridge.contract.methods.setWrappedCurrency(wrbtc.address);
        await methodCall.call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(bridge.address, 0, methodCall.encodeABI(), { from: accounts[0] });
        const allowTokens = await AllowTokens.at(deployedJson.AllowTokensProxy);
        methodCall = allowTokens.contract.methods.setToken(wrbtc.address, '0');
        await methodCall.call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(allowTokens.address, 0, methodCall.encodeABI(), { from: accounts[0] });
    } else {
        methodCall = bridge.contract.methods.setWrappedCurrency(deployedJson.WrappedCurrency);
        await methodCall.call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(bridge.address, 0, methodCall.encodeABI(), { from: accounts[0] });
    }
    methodCall = bridge.contract.methods.initDomainSeparator();
    await methodCall.call({from:deployedJson.MultiSig})
    await multiSig.submitTransaction(bridge.address, 0, methodCall.encodeABI(), { from: accounts[0] });
};