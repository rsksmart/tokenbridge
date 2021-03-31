const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require("AllowTokens_old");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            const multiSig = await MultiSigWallet.deployed();
            return deployer.deploy(AllowTokens, multiSig.address);
        });
};