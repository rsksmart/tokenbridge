const SideTokenFactory = artifacts.require('SideTokenFactory');
const BridgeProxy = artifacts.require("BridgeProxy");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            const sideTokenFactory = await deployer.deploy(SideTokenFactory);
            const bridgeProxy = await BridgeProxy.deployed();
            await sideTokenFactory.transferPrimary(bridgeProxy.address);
        });
};