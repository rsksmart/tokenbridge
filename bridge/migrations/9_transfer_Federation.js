const Bridge = artifacts.require("Bridge_v0");
const Federation = artifacts.require('Federation');
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