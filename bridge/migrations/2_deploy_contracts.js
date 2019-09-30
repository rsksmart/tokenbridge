const Bridge = artifacts.require("Bridge");
const Manager = artifacts.require("Manager");
const MainToken = artifacts.require('MainToken');

const fs = require('fs');

const blocksBetweenCrossEvents = 0;
const minimumPedingTransfersCount = 0;

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, network) {
    const crossTopic = web3.utils.sha3('Cross(address,address,uint256)');
    const tokenTopic = web3.utils.sha3('Token(address,string)');
    let mmrInstance = null;

    let symbol = 'e';
    
    if(network == 'regtest' || network == 'testnet')
        symbol = 'r';

    deployer.deploy(Manager)
    .then(() => Manager.deployed())
    .then(() => deployer.deploy(Bridge, Manager.address, symbol.charCodeAt(), blocksBetweenCrossEvents, minimumPedingTransfersCount))
    .then(() => Bridge.deployed())
    .then( () => {
        if(shouldDeployToken(network)) {
            return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'))
                .then(() => MainToken.deployed());
        }
    })
    .then(async () => {
        const currentProvider = deployer.networks[network];
        const config = {
            bridge: Bridge.address,
            privateKey: ""
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
        
        fs.writeFileSync(`../submitter/${network}.json`, JSON.stringify(config, null, 4));
    });
};