//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy by using Bridge_v0
const Bridge = artifacts.require("Bridge_v0");
const BridgeImpl = artifacts.require("Bridge");
const Federation = artifacts.require('Federation');
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

            const bridgeImpl = new web3.eth.Contract(BridgeImpl.abi, bridge.address);
            let data = bridgeImpl.methods.changeFederation(federation.address).encodeABI();
            await multiSig.submitTransaction(bridge.address, 0, data, { from: accounts[0] });
        });
}