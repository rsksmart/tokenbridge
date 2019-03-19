const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

async function run() {
    const accounts = await promisify(cb => web3.eth.getAccounts(cb));

    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];

    const manager = await FederatedManager.new(members);
    console.log('Manager deployed at', manager.address);
    
    const token = await MainToken.new("NIAM", "NIAM", 18, 10000000);
    console.log('MainToken deployed at', token.address);
    
    const bridge = await Bridge.new(manager.address, token.address);
    console.log('Bridge deployed at', bridge.address);

    await manager.setTransferable(bridge.address);
    console.log('Bridge controlled by Manager');
    
    await token.transfer(bridge.address, 10000000);
    console.log('Bridge has token total supply');
    
    const config = {
        host: web3.currentProvider.host,
        accounts: accounts,
        bridge: bridge.address,
        token: token.address,
        manager: manager.address,
        members: members
    };
    
    fs.writeFileSync('../sideconf.json', JSON.stringify(config, null, 4));
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}