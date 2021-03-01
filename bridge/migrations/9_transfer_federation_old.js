const BridgeProxy = artifacts.require("BridgeProxy");
const Federation = artifacts.require('Federation_old');
const MultiSigWallet = artifacts.require('MultiSigWallet');

module.exports = async function(deployer, networkName, accounts) {
    const federation = await Federation.deployed();
    const bridgeProxy = await BridgeProxy.deployed();
    await federation.setBridge(bridgeProxy.address);
    const multiSig = await MultiSigWallet.deployed();
    await federation.transferOwnership(multiSig.address);
}