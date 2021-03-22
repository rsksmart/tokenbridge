//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensProxy = artifacts.require("AllowTokensProxy");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const BridgeProxy = artifacts.require("BridgeProxy");

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(AllowTokens);
    const allowTokensLogic = await AllowTokens.deployed();

    const bridgeProxy = await BridgeProxy.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const proxyAdmin = await ProxyAdmin.deployed();

    const initData = allowTokensLogic.contract.methods.initialize(multiSig.address, bridgeProxy.address).encodeABI();
    await deployer.deploy(AllowTokensProxy, allowTokensLogic.address, proxyAdmin.address, initData);
}