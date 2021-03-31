const MultiSigWallet = artifacts.require("MultiSigWallet");
const Federation = artifacts.require("Federation_old");
const AllowTokens = artifacts.require('AllowTokens_old');
const SideTokenFactory = artifacts.require('SideTokenFactory_old');
const Bridge_old = artifacts.require('Bridge_old');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const BridgeProxy = artifacts.require('BridgeProxy');

module.exports = async (deployer, networkName, accounts) => {
    let symbol = 'e';

    if(networkName == 'rskregtest' || networkName == 'rsktestnet' || networkName == 'rskmainnet')
        symbol = 'r';

    const multiSig = await MultiSigWallet.deployed();
    const allowTokens = await AllowTokens.deployed();
    const sideTokenFactory = await SideTokenFactory.deployed();
    const federation = await Federation.deployed();
    const proxyAdmin = await ProxyAdmin.deployed();

    await deployer.deploy(Bridge_old);
    const bridgeLogic = await Bridge_old.deployed()

    const initData = bridgeLogic.contract.methods.initialize(multiSig.address, federation.address, allowTokens.address, sideTokenFactory.address, symbol).encodeABI();
    await deployer.deploy(BridgeProxy, bridgeLogic.address, proxyAdmin.address, initData);
}