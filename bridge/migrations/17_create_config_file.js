//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy by using Bridge_v0
const Bridge = artifacts.require("Bridge_v0");
const MainToken = artifacts.require('MainToken');
const Federation_v1 = artifacts.require('Federation_v1');
const AllowTokens = artifacts.require("AllowTokens");
const MultiSigWallet = artifacts.require("MultiSigWallet");

const fs = require('fs');

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, networkName, accounts) {
    deployer
    .then(async () => {
        const bridge = await Bridge.deployed();
        const federation = await Federation_v1.deployed();
        const multiSig = await MultiSigWallet.deployed();
        const allowTokens = await AllowTokens.deployed();
        const currentProvider = deployer.networks[networkName];
        const config = {
            bridge: bridge.address.toLowerCase(),
            federation: federation.address.toLowerCase(),
            multiSig: multiSig.address.toLowerCase(),
            allowTokens: allowTokens.address.toLowerCase()
        };
        if(shouldDeployToken(networkName)) {
            const mainToken = await MainToken.deployed();
            config.testToken = mainToken.address.toLowerCase();
            let data = allowTokens.contract.methods.addAllowedToken(mainToken.address).encodeABI();
            await multiSig.submitTransaction(allowTokens.address, 0, data);

            // Uncomment below lines to use multiple federators
            // await multiSig.confirmTransaction(0, { from: accounts[1] });
            // await multiSig.confirmTransaction(0, { from: accounts[2] });
        }
        if (currentProvider.host) {
            let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
            host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
            config.host = host;
        } else {
            config.host = '';
        }
        config.fromBlock = await web3.eth.getBlockNumber();
        if (networkName !== 'soliditycoverage') {
            fs.writeFileSync(`../federator/config/${networkName}.json`, JSON.stringify(config, null, 4));
        }
    });
};