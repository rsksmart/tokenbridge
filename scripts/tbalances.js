
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

(async function() {
    for (var n = 0; n < accounts.length; n++) {
        var account = accounts[n];
        
        var result = await host.callTransaction({
            from: accounts[0],
            to: config.token,
            value: '0x00',
            data: balanceOfHash + simpleabi.encodeValue(account.substring(2))            
        });
        
        const balance = parseInt(result);
        
        console.log('token balance', account, balance);
    }
})();

