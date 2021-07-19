const Federation = artifacts.require('Federation_old');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    // Replace with below line to use multiple federators
    // deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
    await deployer.deploy(Federation, [accounts[0]], 1);
    const federation = await Federation.deployed();
    deployedJson.Federation = federation.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);
}