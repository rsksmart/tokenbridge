const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(MultiSigWallet, [accounts[0]], 1);
};