const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

const mainconfig = require('../mainconf.json');

let fedaccounts = [];

try {
    fedaccounts = require('../mainfeds.json');
}
catch (ex) {}

async function run() {
    let accounts = await promisify(cb => web3.eth.getAccounts(cb));
    console.log(accounts);
    const blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));

    const members = fedaccounts.length ? fedaccounts : [ accounts[1] ];

    const feds = [];
    for (let k = 0; k < members.length; k++)
        feds.push(members[k].address ? members[k].address : members[k]);

    const manager = await FederatedManager.new(feds);
    console.log('Manager deployed at', manager.address);

    const token = await MainToken.new("NIAM", "NIAM", 18, mainconfig.totalTokens);
    console.log('MainToken deployed at', token.address);
    
    const bridge = await Bridge.new(manager.address, token.address);
    console.log('Bridge deployed at', bridge.address);
    
    const block = await web3.eth.getBlock('latest');
    const gasPrice = parseInt(await web3.eth.getGasPrice());
    const config = {
        host: web3.currentProvider.host,
        block: blockNumber,
        accounts: accounts,
        bridge: bridge.address.toLowerCase(),
        token: token.address.toLowerCase(),
        manager: manager.address.toLowerCase(),
        members: members,
        gas: block.gasLimit,
        gasPrice: gasPrice,
        totalTokens: mainconfig.totalTokens,
        confirmations: 0
    };
    
    fs.writeFileSync('../sideconf.json', JSON.stringify(config, null, 4));

    await manager.setTransferable(bridge.address);
    console.log('Bridge controlled by Manager');
    
    await token.transfer(bridge.address, mainconfig.totalTokens);
    console.log('Bridge has token total supply');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    }).catch(console.error);
}