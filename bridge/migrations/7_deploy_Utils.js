//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge_v1");
const Bridge_v2 = artifacts.require("Bridge_v2");
const Utils = artifacts.require("Utils");


module.exports = function(deployer, networkName, accounts) {
    return deployer.deploy(Utils)
    .then( () => {
        return deployer.link(Utils, [Bridge, Bridge_v2]);
    });
}