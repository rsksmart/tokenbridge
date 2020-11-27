//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy by using Bridge_v0
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v2 = artifacts.require("Bridge_v2");
const Federation = artifacts.require('Federation_v1');
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async ()=> {
            if (networkName === 'soliditycoverage') {
                return;
            }
            const multiSig = await MultiSigWallet.deployed();
            const federation = await Federation.deployed();
            const bridge = await Bridge.deployed();

            const bridge_v2 = new web3.eth.Contract(Bridge_v2.abi, bridge.address);
            let data = bridge_v2.methods.changeFederation(federation.address).encodeABI();
            await multiSig.submitTransaction(bridge.address, 0, data, { from: accounts[0] });
        });
}