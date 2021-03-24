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

    let smallAmountConfirmations = '0';
    let mediumAmountConfirmations = '0';
    let largeAmountConfirmations = '0';
    if(networkName == 'rsktestnet') {
        smallAmountConfirmations = '2';
        mediumAmountConfirmations = '4';
        largeAmountConfirmations = '10';
    }
    if(networkName == 'kovan') {
        smallAmountConfirmations = '5';
        mediumAmountConfirmations = '10';
        largeAmountConfirmations = '20';
    }
    if(networkName == 'rskmainnet') {
        smallAmountConfirmations = '30';
        mediumAmountConfirmations = '60';
        largeAmountConfirmations = '120';
    }
    if(networkName == 'ethmainnet') {
        smallAmountConfirmations = '30';
        mediumAmountConfirmations = '60';
        largeAmountConfirmations = '120';
    }
    const initData = allowTokensLogic.contract.methods.initialize(multiSig.address, bridgeProxy.address, smallAmountConfirmations, mediumAmountConfirmations , largeAmountConfirmations).encodeABI();
    await deployer.deploy(AllowTokensProxy, allowTokensLogic.address, proxyAdmin.address, initData);
}