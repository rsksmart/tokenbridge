//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const AllowTokens = artifacts.require('AllowTokens');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    const multiSig = await MultiSigWallet.deployed();
    await deployer.deploy(AllowTokens, multiSig.address);
    const allowTokens = await AllowTokens.deployed();
}