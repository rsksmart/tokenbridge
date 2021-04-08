//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge");
const Utils = artifacts.require("Utils");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(Utils);
    const utils = await Utils.deployed();
    deployedJson.Utils = utils.address.toLowerCase();
    await deployer.link(Utils, [Bridge]);
    deployHelper.saveDeployed(deployedJson);
}