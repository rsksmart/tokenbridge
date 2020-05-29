const SideTokenFactory = artifacts.require('SideTokenFactory_v1');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            return deployer.deploy(SideTokenFactory);
        });
};