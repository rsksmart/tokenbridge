const Bridge = artifacts.require("Bridge");
const Manager = artifacts.require("Manager");
const MainToken = artifacts.require('MainToken');

const fs = require('fs');

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, network) {
    let symbol = 'e';

    if(network == 'regtest' || network == 'testnet')
        symbol = 'r';

    // TODO Deploy MultiSigWallet on pipeline and use its address
    let multiSigAddress = deployer.networks[network].multisig;

    deployer.deploy(Manager)
    .then(() => Manager.deployed())
    .then(() => deployer.deploy(Bridge, multiSigAddress, symbol.charCodeAt()))
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
            multisig: currentProvider.multisig
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