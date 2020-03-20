const SideTokenTemplate = artifacts.require('SideToken_v1');

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(SideTokenTemplate);
};