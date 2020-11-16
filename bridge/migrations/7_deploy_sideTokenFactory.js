const Bridge = artifacts.require("Bridge_v0");
const SideTokenFactory = artifacts.require('SideTokenFactory_v1');

module.exports = function(deployer, networkName, accounts) {
    return deployer.deploy(SideTokenFactory);
}