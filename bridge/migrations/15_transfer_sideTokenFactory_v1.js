//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy
const Bridge = artifacts.require("Bridge_v0");
const SideTokenFactory = artifacts.require('SideTokenFactory_v1');
const { setupLoader } = require('@openzeppelin/contract-loader');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const loader = setupLoader({ provider: web3 }).web3;

            const sideTokenFactory = await SideTokenFactory.deployed();
            const bridge = await Bridge.deployed();
            await sideTokenFactory.transferPrimary(bridge.address);

            const bridge_v1 = loader.fromArtifacts('Bridge_v1', bridge.address);
            await bridge_v1.methods.changeSideTokenFactory(sideTokenFactory.address);
        });
}