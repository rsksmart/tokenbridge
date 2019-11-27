const Bridge = artifacts.require("Bridge_v0");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const MainToken = artifacts.require('MainToken');
const SideTokenFactory = artifacts.require('SideTokenFactory');
const AllowTokens = artifacts.require('AllowTokens');

const fs = require('fs');

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, networkName, accounts) {
    deployer
    .then(async ()=> {
        const sideTokenFactory = await SideTokenFactory.deployed();
        const bridge = await Bridge.deployed();
        sideTokenFactory.transferOwnership(bridge.address);
    })
    .then(() => {
        if(shouldDeployToken(networkName)) {
            return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'));
        }
    }).then(async () => {
        const bridge = await Bridge.deployed();
        const multiSig = await MultiSigWallet.deployed();
        const mainToken = await MainToken.deployed();
        const currentProvider = deployer.networks[networkName];
        const config = {
            bridge: bridge.address,
            privateKey: "",
            multisig: multiSig.address
        };
        if(shouldDeployToken(networkName)) {
            config.testToken = mainToken.address;
            let allowTokens = await AllowTokens.deployed();
            let data = allowTokens.contract.methods.addAllowedToken(mainToken.address).encodeABI();
            await multiSig.submitTransaction(allowTokens.address, 0, data);
        }
        if (currentProvider.host) {
            let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
            host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
            config.host = host;
        } else {
            config.host = '';
        }

        fs.writeFileSync(`../federator/${networkName}.json`, JSON.stringify(config, null, 4));
    });
};