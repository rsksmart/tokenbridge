const Federation = artifacts.require('Federation_old');
const deployHelper = require("../deployed/deployHelper");

module.exports = async function(deployer, networkName) {
    const deployedJson = deployHelper.getDeployed(networkName);
    const federation = await Federation.at(deployedJson.Federation);
    await federation.setBridge(deployedJson.BridgeProxy);
    await federation.transferOwnership(deployedJson.MultiSig);
}