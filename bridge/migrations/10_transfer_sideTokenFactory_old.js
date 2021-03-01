const BridgeProxy = artifacts.require("BridgeProxy");
const SideTokenFactory = artifacts.require('SideTokenFactory_old');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const sideTokenFactory = await SideTokenFactory.deployed();
            const bridgeProxy = await BridgeProxy.deployed();
            await sideTokenFactory.transferPrimary(bridgeProxy.address);
        });
}