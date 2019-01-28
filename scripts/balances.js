
const rskapi = require('rskapi');

const chainname = process.argv[2];
const chain = process.argv[3];

const config = require('../bridge/' + chainname + 'conf.json');
const host = rskapi.host(chain);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);
console.log('manager', config.manager);

if (config.custodian)
    console.log('custodian', config.custodian);

console.log();


var accounts;

var n = 0;

accounts = config.accounts;

if (config.token)
    accounts.push(config.token);
if (config.manager)
    accounts.push(config.manager);
if (config.custodian)
    accounts.push(config.custodian);

(async function() {
    for (var n = 0; n < accounts.length; n++) {
        var account = accounts[n];
        
        var result = await host.callTransaction({
            from: accounts[0],
            to: config.token,
            value: '0x00',
            data: balanceOfHash + "000000000000000000000000" + account.substring(2)            
        });
        
        const balance = parseInt(result);
        
        console.log('balance', account, balance);
    }
})();

