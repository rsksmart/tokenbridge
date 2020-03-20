const SideTokenFactory = artifacts.require('SideTokenFactory_v1');
const SideTokenTemplate = artifacts.require('SideToken_v1');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            const sideTokenTemplate = await SideTokenTemplate.deployed();
            return deployer.deploy(SideTokenFactory, sideTokenTemplate.address);
        });
};