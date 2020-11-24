//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge_v1 = artifacts.require("Bridge_v1");
const Utils = artifacts.require("Utils");


module.exports = async (deployer) => {
    await deployer.deploy(Utils);
    await deployer.link(Utils, [Bridge_v1]);
}