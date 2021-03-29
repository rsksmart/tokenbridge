
const MainToken = artifacts.require('MainToken');
const utils = require('../test/utils');

module.exports = async (deployer, networkName, accounts) => {
    if(utils.isLocalNetwork(networkName)) {
        return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'));
    }
}