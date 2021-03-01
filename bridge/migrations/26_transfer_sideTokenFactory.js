const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const SideTokenFactory = artifacts.require('SideTokenFactory');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {

    const sideTokenFactory = await SideTokenFactory.deployed();
    const bridgeProxy = await BridgeProxy.deployed();

    const multiSig = await MultiSigWallet.deployed();

    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxy.address);
    let data = bridge.methods.changeSideTokenFactory(sideTokenFactory.address).encodeABI();

    await multiSig.submitTransaction(bridgeProxy.address, 0, data, { from: accounts[0] });

}