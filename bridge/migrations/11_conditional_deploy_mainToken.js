
const MainToken = artifacts.require('MainToken');
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName) => {
    if(deployHelper.isLocalNetwork(networkName)) {
        return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'));
    }
}