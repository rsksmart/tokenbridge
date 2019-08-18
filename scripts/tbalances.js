
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

if (config.token)
    accounts.push(config.token);
if (config.manager)
    accounts.push(config.manager);
if (config.bridge)
    accounts.push(config.bridge);

async function getTokenBalance(account) {
    const address = account.address ? account.address : account;
    
    var result = await host.callTransaction({
        from: address,
        to: config.token,
        value: '0x00',
        data: balanceOfHash + simpleabi.encodeValue(address)            
    });
    
    const balance = parseInt(result);
    
    console.log('token balance', account.address ? account.address : account, balance);    
}

(async function() {
    for (var n = 0; n < accounts.length; n++)
        getTokenBalance(accounts[n]);
})();

