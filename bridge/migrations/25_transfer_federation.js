const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const Federation = artifacts.require('Federation');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    if (networkName === 'soliditycoverage') {
        return;
    }
    const multiSig = await MultiSigWallet.deployed();
    const federation = await Federation.deployed();
    const bridgeProxy = await BridgeProxy.deployed();

    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxy.address);
    let data = bridge.methods.changeFederation(federation.address).encodeABI();
    await multiSig.submitTransaction(bridgeProxy.address, 0, data, { from: accounts[0] });

}