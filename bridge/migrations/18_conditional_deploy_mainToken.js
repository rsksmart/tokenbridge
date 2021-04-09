
const MainToken = artifacts.require('MainToken');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName) => {
    if(deployHelper.isLocalNetwork(networkName)) {
        const deployedJson = deployHelper.getDeployed(networkName);
        await deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'));
        const mainToken = await MainToken.deployed();
        deployedJson.MainToken = mainToken.address;
        deployHelper.saveDeployed(deployedJson);
    }
}