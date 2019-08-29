const MainToken = artifacts.require('MainToken');

const amount = '100';
module.exports = function(deployer, network) {
    if(network.toLowerCase().includes('mainnet')) return;
    deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei(amount));
};