//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);

    const bridge = new web3.eth.Contract(Bridge.abi, deployedJson.BridgeProxy);

    let data = bridge.methods.changeAllowTokens(deployedJson.AllowTokensProxy).encodeABI();

    //Check before sending the transaction as it eats the error
    await bridge.methods.changeAllowTokens(deployedJson.AllowTokensProxy).call({ from: deployedJson.MultiSig });
    await multiSig.submitTransaction(deployedJson.BridgeProxy, 0, data, { from: accounts[0] });
}