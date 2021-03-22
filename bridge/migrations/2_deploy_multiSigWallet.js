const MultiSigWallet = artifacts.require("MultiSigWallet");
const ProxyAdmin = artifacts.require("ProxyAdmin");


module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(MultiSigWallet, [accounts[0]], 1);
    // Replace with below line to use multiple federators
    // deployer.deploy(MultiSigWallet, [accounts[0], accounts[1], accounts[2]], 3);
    const multiSig = await MultiSigWallet.deployed();

    await deployer.deploy(ProxyAdmin);
    const proxyAdmin = await ProxyAdmin.deployed();
    await proxyAdmin.transferOwnership(multiSig.address);
};