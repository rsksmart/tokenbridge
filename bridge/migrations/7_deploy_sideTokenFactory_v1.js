const Bridge = artifacts.require("Bridge_v0");
const SideTokenFactory = artifacts.require('SideTokenFactory_v1');

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(SideTokenFactory);
}