const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Utils = artifacts.require("Utils");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const WRBTC = artifacts.require("WRBTC");
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensProxy = artifacts.require("AllowTokensProxy");


module.exports = async (deployer, networkName, accounts) => {
    const utils = await Utils.deployed();
    await Bridge.link(Utils, utils.address);
    await deployer.deploy(Bridge);
    const bridgeLogic = await Bridge.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const bridgeProxy = await BridgeProxy.deployed();

    // We need the multisig to update the contract
    // We deploy the contract manually and point the proxy to the new logic
    const proxyAdmin = await ProxyAdmin.deployed();

    let data = proxyAdmin.contract.methods.upgrade(bridgeProxy.address, bridgeLogic.address).encodeABI();
    await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });

    const bridge = await Bridge.at(bridgeProxy.address);
    if (networkName == 'kovan') {
        data = bridge.contract.methods.setWrappedCurrency('0xd0A1E359811322d97991E03f863a0C30C2cF029C').encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    } else if (networkName == 'rsktestnet') {
        data = bridge.contract.methods.setWrappedCurrency('0x09b6ca5e4496238a1f176aea6bb607db96c2286e').encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    } else if (networkName == 'ethmainnet') {
        data = bridge.contract.methods.setWrappedCurrency('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2').encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    } else if (networkName == 'rskmainnet') {
        data = bridge.contract.methods.setWrappedCurrency('0x967f8799af07df1534d48a95a5c9febe92c53ae0').encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    } else {
        await deployer.deploy(WRBTC);
        const wrbtc = await WRBTC.deployed();
        data = bridge.contract.methods.setWrappedCurrency(wrbtc.address).encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
        const allowTokensProxy = await AllowTokensProxy.deployed();
        const allowTokens = await AllowTokens.at(allowTokensProxy.address);
        data = allowTokens.contract.methods.setToken(wrbtc.address, '0').encodeABI();
        await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
    }
};