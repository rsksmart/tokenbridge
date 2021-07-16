const SideTokenFactory = artifacts.require('SideTokenFactory');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(SideTokenFactory);
    const sideTokenFactory = await SideTokenFactory.deployed();
    deployedJson.SideTokenFactory = sideTokenFactory.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);

    await sideTokenFactory.transferPrimary(deployedJson.BridgeProxy);
};