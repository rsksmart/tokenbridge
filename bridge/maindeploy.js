const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

let fedaccounts = [];

try {
    fedaccounts = require('../mainfeds.json');
}
catch (ex) {}

async function run() {
    const accounts = await promisify(cb => web3.eth.getAccounts(cb));
    const blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));
    
    const members = fedaccounts.length ? fedaccounts : [ accounts[0] ];
    console.log('Members:', members);
    const feds = [];
    
    for (let k = 0; k < members.length; k++) {
        feds.push(members[k].address ? members[k].address : members[k]);
    }
    
    const manager = await FederatedManager.new(feds);
    console.log('Manager deployed at', manager.address);
    
    const totalTokens = web3.utils.toWei('100', 'ether');
    const token = await MainToken.new("MAIN", "MAIN", 18, totalTokens);
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
        totalTokens: totalTokens,
        confirmations: 0
    };
    
    fs.writeFileSync('../mainconf.json', JSON.stringify(config, null, 4));

    await manager.setTransferable(bridge.address);
    console.log('Bridge controlled by Manager');

    await token.transfer(accounts[0], 10);
    console.log('Set 10 tokens to the first account for testing purposes');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    }).catch(console.error);
}