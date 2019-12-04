const Bridge = artifacts.require("Bridge_v0");
const MainToken = artifacts.require('MainToken');
const AllowTokens = artifacts.require("AllowTokens");
const MultiSigWallet = artifacts.require("MultiSigWallet");

const fs = require('fs');
const toWei = web3.utils.toWei;

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, networkName, accounts) {
    deployer
    .then(async () => {
        const bridge = await Bridge.deployed();
        const federation = await bridge.getFederation();
        const multiSig = await MultiSigWallet.deployed();
        const currentProvider = deployer.networks[networkName];
        const config = {
            bridge: bridge.address,
            federation: federation
        };
        if(shouldDeployToken(networkName)) {
            const mainToken = await MainToken.deployed();
            config.testToken = mainToken.address;
            let allowTokens = await AllowTokens.deployed();
            let data = allowTokens.contract.methods.addAllowedToken(mainToken.address, toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
            await multiSig.submitTransaction(allowTokens.address, 0, data);
        }
        if (currentProvider.host) {
            let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
            host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
            config.host = host;
        } else {
            config.host = '';
        }

        if (networkName !== 'coverage') {
            fs.writeFileSync(`../federator/${networkName}.json`, JSON.stringify(config, null, 4));
        }
    });
};