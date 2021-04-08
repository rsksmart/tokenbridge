const MultiSigWallet = artifacts.require("MultiSigWallet");
const Federation = artifacts.require("Federation_old");
const AllowTokens = artifacts.require('AllowTokens_old');
const SideTokenFactory = artifacts.require('SideTokenFactory_old');
const Bridge_old = artifacts.require('Bridge_old');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const BridgeProxy = artifacts.require('BridgeProxy');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    let symbol = 'e';

    if(networkName == 'rskregtest' || networkName == 'rsktestnet' || networkName == 'rskmainnet')
        symbol = 'r';

    const deployedJson = deployHelper.getDeployed(networkName);
    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);
    const allowTokens = await AllowTokens.at(deployedJson.AllowTokens);
    const sideTokenFactory = await SideTokenFactory.at(deployedJson.SideTokenFactory);
    const federation = await Federation.at(deployedJson.Federation);
    const proxyAdmin = await ProxyAdmin.at(deployedJson.ProxyAdmin);

    await deployer.deploy(Bridge_old);
    const bridgeLogic = await Bridge_old.deployed()
    deployedJson.Bridge = bridgeLogic.address.toLowerCase();

    const initData = bridgeLogic.contract.methods.initialize(multiSig.address, federation.address, allowTokens.address, sideTokenFactory.address, symbol).encodeABI();
    await deployer.deploy(BridgeProxy, bridgeLogic.address, proxyAdmin.address, initData);
    const bridgeProxy = await BridgeProxy.deployed();
    deployedJson.BridgeProxy = bridgeProxy.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);
}