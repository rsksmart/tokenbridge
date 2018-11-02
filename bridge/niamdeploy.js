const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Custodian = artifacts.require('./Custodian');

async function run() {
    const accounts = await promisify(cb => web3.eth.getAccounts(cb));

    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];

    const manager = await FederatedManager.new(members);
    console.log('Manager deployed at', manager.address);
    
    const token = await MainToken.new("NIAM", "NIAM", 18, 10000000);
    console.log('MainToken deployed at', token.address);
    
    const custodian = await Custodian.new(manager.address, token.address);
    console.log('Custodian deployed at', custodian.address);

    await manager.setTransferable(custodian.address);
    console.log('Custodian controlled by Manager');
    
    await token.transfer(custodian.address, 10000000);
    console.log('Custodian has token total supply');
    
    const config = {
        accounts: accounts,
        custodian: custodian.address,
        token: token.address,
        manager: manager.address,
        members: members
    };
    
    fs.writeFileSync('sideconf.json', JSON.stringify(config, null, 4));
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}