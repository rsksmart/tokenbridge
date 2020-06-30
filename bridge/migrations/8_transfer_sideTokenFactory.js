const Bridge = artifacts.require("Bridge_v0");
const SideTokenFactory = artifacts.require('SideTokenFactory_v0');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const sideTokenFactory = await SideTokenFactory.deployed();
            const bridge = await Bridge.deployed();
            console.log("Bridge Address", bridge.address)
            await sideTokenFactory.transferPrimary(bridge.address);
        });
}