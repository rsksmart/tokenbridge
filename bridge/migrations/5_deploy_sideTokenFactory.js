const SideTokenFactory = artifacts.require('SideTokenFactory');

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(SideTokenFactory);
};