const Validators = artifacts.require("Validators_v2");
const Bridge = artifacts.require("Bridge_v0");
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(Validators, [accounts[0]], 1);
    // Replace with below line to use multiple federators
    // return deployer.deploy(Validators, [accounts[0], accounts[1], accounts[2]], 3);
    const validators = await Validators.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const bridge = await Bridge.deployed();

    await validators.setBridge(bridge.address);
    await validators.transferOwnership(multiSig.address);
};