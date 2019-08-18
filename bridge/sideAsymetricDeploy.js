const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const SideToken = artifacts.require('./SideToken');

let fedaccounts = [];

try {
    fedaccounts = require('../mainfeds.json');
}
catch (ex) {}

async function run() {
    const accounts = await promisify(cb => web3.eth.getAccounts(cb));

    const members = fedaccounts.length ? fedaccounts : [ accounts[1] ];

    const manager = await FederatedManager.new(members);
    console.log('Manager deployed at', manager.address);
    
    const token = await SideToken.new("SIDE", "SIDE", 18, manager.address);
    console.log('SideToken deployed at', token.address);

    console.log('SideToken controlled by', await token.manager());

    await manager.setTransferable(token.address);
    console.log('SideToken controlled by Manager');
    
    const transferable = await manager.transferable();
    console.log('Manager controls', transferable);
    
    const config = {
        host: web3.currentProvider.host,
        accounts: accounts,
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
    }).catch(console.error);
}

