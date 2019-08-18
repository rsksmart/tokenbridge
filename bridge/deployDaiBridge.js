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
    console.log("Deploy DAI Bridge on ETH");
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
    
    const tokenAddress = '0xc4375b7de8af5a38a93548eb8453a498222c4ff2';
    const totalTokens = web3.utils.toWei('2033040', 'ether');

    const bridge = await Bridge.new(manager.address, tokenAddress);
    console.log('Bridge deployed at', bridge.address);
    
    const block = await web3.eth.getBlock('latest');
    const gasPrice = parseInt(await web3.eth.getGasPrice());
    const config = {
        host: web3.currentProvider.host,
        block: blockNumber,
        accounts: accounts,
        bridge: bridge.address.toLowerCase(),
        token: tokenAddress.toLowerCase(),
        manager: manager.address.toLowerCase(),
        members: members,
        gas: block.gasLimit,
        gasPrice: gasPrice,
        totalTokens: totalTokens,
        confirmations: 6
    };
    
    fs.writeFileSync('../daiconf.json', JSON.stringify(config, null, 4));

    await manager.setTransferable(bridge.address);
    console.log('Bridge controlled by Manager');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    }).catch(console.error);
}