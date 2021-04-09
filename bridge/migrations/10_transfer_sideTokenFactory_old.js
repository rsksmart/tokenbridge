const SideTokenFactory = artifacts.require('SideTokenFactory_old');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    const sideTokenFactory = await SideTokenFactory.at(deployedJson.SideTokenFactory);
    await sideTokenFactory.transferPrimary(deployedJson.BridgeProxy);
}