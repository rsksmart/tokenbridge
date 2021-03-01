//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge");
const Utils = artifacts.require("Utils");


module.exports = async (deployer) => {
    await deployer.deploy(Utils);
    await deployer.link(Utils, [Bridge]);
}