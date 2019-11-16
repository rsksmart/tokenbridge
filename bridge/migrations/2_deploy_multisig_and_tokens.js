const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require('AllowTokens');
const SideTokenFactory = artifacts.require('SideTokenFactory');


require('@openzeppelin/test-helpers/configure')({ provider: web3.currentProvider, environment: 'truffle' });
const { singletons } = require('@openzeppelin/test-helpers');

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(MultiSigWallet, [accounts[0]], 1)
    .then(() => MultiSigWallet.deployed())
    .then(() => deployer.deploy(AllowTokens, MultiSigWallet.address))
    .then(() => {
        if (networkName === 'development' || networkName == 'regtest') {
            // In a test environment an ERC777 token requires deploying an ERC1820 registry
            return singletons.ERC1820Registry(accounts[0]);
          }
    })
    .then(() => deployer.deploy(SideTokenFactory));
};