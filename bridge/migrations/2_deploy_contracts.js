const Bridge = artifacts.require("Bridge");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const MainToken = artifacts.require('MainToken');
const AllowTokens = artifacts.require('AllowTokens');

const fs = require('fs');

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, network, accounts) {
    let symbol = 'e';

    if(network == 'regtest' || network == 'testnet')
        symbol = 'r';

    deployer.deploy(MultiSigWallet, [accounts[0]], 1)
    .then(() => MultiSigWallet.deployed())
    .then(() => deployer.deploy(AllowTokens, MultiSigWallet.address))
    .then(() => AllowTokens.deployed())
    .then(() => deployer.deploy(Bridge, MultiSigWallet.address, AllowTokens.address, symbol.charCodeAt()))
    .then(() => Bridge.deployed())
    .then(() => {
        if(shouldDeployToken(network)) {
            return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'))
                .then(() => MainToken.deployed());
        }
    })
    .then(async () => {
        const currentProvider = deployer.networks[network];
        const config = {
            bridge: Bridge.address,
            privateKey: "",
            multisig: MultiSigWallet.address
        };
        if(shouldDeployToken(network)) {
            config.testToken = MainToken.address;
        }
        if (currentProvider.host) {
            let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
            host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
            config.host = host;
        } else {
            config.host = '';
        }

        fs.writeFileSync(`../federator/${network}.json`, JSON.stringify(config, null, 4));
    });
};