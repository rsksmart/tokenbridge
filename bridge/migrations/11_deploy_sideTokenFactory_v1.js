const SideTokenFactory = artifacts.require('SideTokenFactory_v1');
const Bridge = artifacts.require("Bridge_v0");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            const sideTokenFactory = await deployer.deploy(SideTokenFactory);
            const bridge = await Bridge.deployed();
            await sideTokenFactory.transferPrimary(bridge.address);
        });
};