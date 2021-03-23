const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(MultiSigWallet, [accounts[0]], 1);

    // Replace with below line to use multiple federators
    // deployer.deploy(MultiSigWallet, [accounts[0], accounts[1], accounts[2]], 3);
};