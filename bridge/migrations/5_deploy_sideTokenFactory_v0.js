const SideTokenFactory = artifacts.require('SideTokenFactory_v0');

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(SideTokenFactory);
};