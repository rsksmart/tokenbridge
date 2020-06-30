const Federation = artifacts.require("Federation_v1");
const Bridge = artifacts.require("Bridge_v0");
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            const federation = await deployer.deploy(Federation, [accounts[0]], 1);
            // Replace with below line to use multiple federators
            // return deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
            
            const multiSig = await MultiSigWallet.deployed();
            const bridge = await Bridge.deployed();

            await federation.setBridge(bridge.address);
            await federation.transferOwnership(multiSig.address);

            
        });
};