const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require("AllowTokens_old");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);
    await deployer.deploy(AllowTokens, multiSig.address);
    const allowTokens = await AllowTokens.deployed();
    deployedJson.AllowTokens = allowTokens.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);
};