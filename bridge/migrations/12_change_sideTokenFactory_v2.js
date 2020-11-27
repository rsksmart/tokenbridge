//We are actually gona use Bridge_v2 but truffle only knows the address of the proxy
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v2 = artifacts.require("Bridge_v2");
const SideTokenFactory = artifacts.require('SideTokenFactory_v2');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    const sideTokenFactory = await SideTokenFactory.deployed();
    const bridge = await Bridge.deployed();
    console.log("Bridge Address", bridge.address)
    await sideTokenFactory.transferPrimary(bridge.address);

    if (networkName === 'soliditycoverage') {
        return;
    }
    const multiSig = await MultiSigWallet.deployed();

    const bridge_v2 = new web3.eth.Contract(Bridge_v2.abi, bridge.address);
    let data = bridge_v2.methods.changeSideTokenFactory(sideTokenFactory.address).encodeABI();

    await multiSig.submitTransaction(bridge.address, 0, data, { from: accounts[0] });

}