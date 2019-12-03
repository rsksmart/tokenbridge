const Bridge = artifacts.require("Bridge_v0");
const SideTokenFactory = artifacts.require('SideTokenFactory');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const sideTokenFactory = await SideTokenFactory.deployed();
            const bridge = await Bridge.deployed();
            await sideTokenFactory.transferPrimary(bridge.address);
        });
}