//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge_old = artifacts.require("Bridge_old");
const Utils = artifacts.require("Utils_old");


module.exports = async (deployer) => {
    await deployer.deploy(Utils);
    await deployer.link(Utils, [Bridge_old]);
}