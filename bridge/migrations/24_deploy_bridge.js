const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Utils = artifacts.require("Utils");
const ProxyAdmin = artifacts.require("ProxyAdmin");


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

    const data = proxyAdmin.contract.methods.upgrade(bridgeProxy.address, bridgeLogic.address).encodeABI();
    await multiSig.submitTransaction(proxyAdmin.address, 0, data, { from: accounts[0] });
};