const Federation = artifacts.require("Federation");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(Federation, [accounts[0]], 1);
    // Replace with below line to use multiple federators
    // return deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
    const federation = await Federation.deployed();
    deployedJson.Federation = federation.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);

    await federation.setBridge(deployedJson.BridgeProxy);
    await federation.transferOwnership(deployedJson.MultiSig);
};