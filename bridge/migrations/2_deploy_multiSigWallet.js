const MultiSigWallet = artifacts.require("MultiSigWallet");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(MultiSigWallet, [accounts[0]], 1);
    // Replace with below line to use multiple federators
    // deployer.deploy(MultiSigWallet, [accounts[0], accounts[1], accounts[2]], 3);
    const multiSig = await MultiSigWallet.deployed();
    deployedJson.MultiSig = multiSig.address.toLowerCase();

    await deployer.deploy(ProxyAdmin);
    const proxyAdmin = await ProxyAdmin.deployed();
    deployedJson.ProxyAdmin = proxyAdmin.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);
    await proxyAdmin.transferOwnership(multiSig.address);
};