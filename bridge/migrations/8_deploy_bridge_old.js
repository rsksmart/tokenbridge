const Bridge_old = artifacts.require('Bridge_old');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const BridgeProxy = artifacts.require('BridgeProxy');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    let symbol = 'e';

    if(networkName == 'rskregtest' || networkName == 'rsktestnet' || networkName == 'rskmainnet')
        symbol = 'r';

    const deployedJson = deployHelper.getDeployed(networkName);
    const proxyAdmin = await ProxyAdmin.at(deployedJson.ProxyAdmin);

    await deployer.deploy(Bridge_old);
    const bridgeLogic = await Bridge_old.deployed()
    deployedJson.Bridge = bridgeLogic.address.toLowerCase();

    const initData = bridgeLogic.contract.methods.initialize(
        deployedJson.MultiSig,
        deployedJson.Federation,
        deployedJson.AllowTokens,
        deployedJson.SideTokenFactory,
        symbol
    ).encodeABI();

    await deployer.deploy(BridgeProxy, bridgeLogic.address, proxyAdmin.address, initData);
    const bridgeProxy = await BridgeProxy.deployed();
    deployedJson.BridgeProxy = bridgeProxy.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);
}
