
const rskapi = require('rskapi');
const simpleabi = require('simpleabi');

const chainname = process.argv[2];

const config = require('../' + chainname + 'conf.json');
const host = rskapi.host(config.host);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);
console.log('manager', config.manager);

if (config.bridge)
    console.log('bridge', config.bridge);

console.log();


var accounts;

var n = 0;

accounts = config.accounts;

async function getBalance(account) {
    const address = account.address ? account.address : account;
    
    const result = await host.getBalance(address);
    
    const balance = parseInt(result);
    
    console.log('value balance', address, balance);    
}

(async function() {
    for (var n = 0; n < accounts.length; n++)
        getBalance(accounts[n]);
    for (var n = 0; n < config.members.length; n++)
        getBalance(config.members[n]);
})();

