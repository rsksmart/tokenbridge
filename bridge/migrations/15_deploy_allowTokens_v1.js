//We are actually gona use Bridge_v2 but truffle only knows the address of the proxy
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v2 = artifacts.require("Bridge_v2");
const AllowTokens = artifacts.require('AllowTokens_v1');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    const multiSig = await MultiSigWallet.deployed();
    await deployer.deploy(AllowTokens, multiSig.address);
    const allowTokens = await AllowTokens.deployed();
    if (networkName === 'soliditycoverage') {
        return;
    }
    const bridge = await Bridge.deployed();
    const bridge_v2 = new web3.eth.Contract(Bridge_v2.abi, bridge.address);
    let data = bridge_v2.methods.changeAllowTokens(allowTokens.address).encodeABI();

    await multiSig.submitTransaction(bridge.address, 0, data, { from: accounts[0] });
}