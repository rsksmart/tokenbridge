const Federation = artifacts.require("Federation");
const BridgeProxy = artifacts.require("BridgeProxy");
const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(Federation, [accounts[0]], 1);
    // Replace with below line to use multiple federators
    // return deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
    const federation = await Federation.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const bridgeProxy = await BridgeProxy.deployed();

    await federation.setBridge(bridgeProxy.address);
    await federation.transferOwnership(multiSig.address);
};