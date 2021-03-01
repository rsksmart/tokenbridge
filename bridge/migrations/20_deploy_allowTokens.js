//We are actually gona use the latest Bridge but truffle only knows the address of the proxy
const BridgeProxy = artifacts.require("BridgeProxy");
const Bridge = artifacts.require("Bridge");
const AllowTokens = artifacts.require('AllowTokens');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    const multiSig = await MultiSigWallet.deployed();
    await deployer.deploy(AllowTokens, multiSig.address);
    const allowTokens = await AllowTokens.deployed();
    if (networkName === 'soliditycoverage') {
        return;
    }
    const bridgeProxy = await BridgeProxy.deployed();
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxy.address);
    let data = bridge.methods.changeAllowTokens(allowTokens.address).encodeABI();

    await multiSig.submitTransaction(bridgeProxy.address, 0, data, { from: accounts[0] });
}