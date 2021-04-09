const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Utils = artifacts.require("Utils");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const WRBTC = artifacts.require("WRBTC");
const AllowTokens = artifacts.require('AllowTokens');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await Bridge.link(Utils, deployHelper.Utils);
    await deployer.deploy(Bridge);
    const bridgeLogic = await Bridge.deployed();
    deployedJson.Bridge = bridgeLogic.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);

    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);

    // We need the multisig to update the contract
    // We deploy the contract manually and point the proxy to the new logic
    const proxyAdmin = await ProxyAdmin.at(deployedJson.ProxyAdmin);

    let data = proxyAdmin.contract.methods.upgrade(deployedJson.BridgeProxy, deployedJson.Bridge).encodeABI();
    await proxyAdmin.contract.methods.upgrade(deployedJson.BridgeProxy, deployedJson.Bridge).call({from:deployedJson.MultiSig})
    await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });

    const bridge = await Bridge.at(deployedJson.BridgeProxy);
    if (deployHelper.isLocalNetwork(networkName)) {
        await deployer.deploy(WRBTC);
        const wrbtc = await WRBTC.deployed();
        deployedJson.WrappedCurrency = wrbtc.address.toLowerCase();
        deployHelper.saveDeployed(deployedJson);

        data = bridge.contract.methods.setWrappedCurrency(wrbtc.address).encodeABI();
        await bridge.contract.methods.setWrappedCurrency(wrbtc.address).call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
        const allowTokens = await AllowTokens.at(deployedJson.AllowTokensProxy);
        data = allowTokens.contract.methods.setToken(wrbtc.address, '0').encodeABI();
        await allowTokens.contract.methods.setToken(wrbtc.address, '0').call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    } else {
        data = bridge.contract.methods.setWrappedCurrency(deployedJson.WrappedCurrency).encodeABI();
        await bridge.contract.methods.setWrappedCurrency(deployedJson.WrappedCurrency).call({from:deployedJson.MultiSig})
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    }
};