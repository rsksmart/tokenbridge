//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy by using Bridge_v0
const Bridge = artifacts.require("Bridge_v0");
const Federation = artifacts.require('Federation_v1');
const { setupLoader } = require('@openzeppelin/contract-loader');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const loader = setupLoader({ provider: web3 }).web3;

            const federation = await Federation.deployed();
            const bridge = await Bridge.deployed();

            const bridge_v1 = loader.fromArtifacts('Bridge_v1', bridge.address);
            await bridge_v1.methods.changeFederation(federation.address);
        });
}