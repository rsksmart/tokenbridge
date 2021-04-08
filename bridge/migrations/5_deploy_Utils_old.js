//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge_old = artifacts.require("Bridge_old");
const Utils = artifacts.require("Utils_old");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(Utils);
    const utils = await Utils.deployed();
    deployedJson.Utils = utils.address.toLowerCase();
    await deployer.link(Utils, [Bridge_old]);
    deployHelper.saveDeployed(deployedJson);
}