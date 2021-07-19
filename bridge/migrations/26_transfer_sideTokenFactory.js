const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);

    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);

    const bridge = new web3.eth.Contract(Bridge.abi, deployedJson.BridgeProxy);
    const methodCall = bridge.methods.changeSideTokenFactory(deployedJson.SideTokenFactory);

    await bridge.methods.changeSideTokenFactory(deployedJson.SideTokenFactory).call({ from: deployedJson.MultiSig });
    await multiSig.submitTransaction(deployedJson.BridgeProxy, 0, methodCall.encodeABI(), { from: accounts[0] });
}