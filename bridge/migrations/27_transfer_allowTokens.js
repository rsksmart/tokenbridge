//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const AllowTokensProxy = artifacts.require('AllowTokensProxy');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    const multiSig = await MultiSigWallet.deployed();
    const allowTokensProxy = await AllowTokensProxy.deployed();
    const bridgeProxy = await BridgeProxy.deployed();
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxy.address);
    let data = bridge.methods.changeAllowTokens(allowTokensProxy.address).encodeABI();

    await multiSig.submitTransaction(bridgeProxy.address, 0, data, { from: accounts[0] });
}