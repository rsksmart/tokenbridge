const Bridge = artifacts.require("Bridge_v1");
const Federation = artifacts.require('Federation_v1');
const MultiSigWallet = artifacts.require('MultiSigWallet');

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            const federation = await Federation.deployed();
            const bridge = await Bridge.deployed();
            await federation.setBridge(bridge.address);
            const multiSig = await MultiSigWallet.deployed();
            await federation.transferOwnership(multiSig.address);
        });
}