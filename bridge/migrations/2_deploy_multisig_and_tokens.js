const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require('AllowTokens');


module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(MultiSigWallet, [accounts[0]], 1)
    .then(() => MultiSigWallet.deployed())
    .then(() => deployer.deploy(AllowTokens, MultiSigWallet.address))
    .then(() => AllowTokens.deployed());
};