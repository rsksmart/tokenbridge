
const rskapi = require('rskapi');
const sasync = require('simpleasync');
const sabi = require('simpleabi');

const transferHash = '0xa9059cbb';

const chainname = process.argv[2];
const chain = process.argv[3];

const fromAccount = process.argv[4];
const toAccount = process.argv[5];
const amount = parseInt(process.argv[6]);

const config = require('../bridge/' + chainname + 'conf.json');
const host = rskapi.host(chain);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);
console.log('manager', config.manager);
if (config.bridge)
    console.log('bridge', config.bridge);

console.log();

var accounts;

sasync()
.exec(function (next) {
    host.getAccounts(next);
})
.then(function (data, next) {
    accounts = data;    
    
    console.log('accounts');
    console.dir(accounts);

    if (config.token)
        accounts.push(config.token);
    if (config.manager)
        accounts.push(config.manager);
    if (config.bridge)
        accounts.push(config.bridge);
    
    var toa = toAccount[0].toLowerCase();
    
    var toAcc;
    
    if (toa === 'm')
        toAcc = config.manager;
    else if (toa === 'b')
        toAcc = config.bridge;
    else
        toAcc = accounts[toAccount];

    const abi = sabi.encodeValues([ toAcc, amount ]);
    
    console.log('data', abi);
    host.sendTransaction({
        from: accounts[fromAccount],
        to: config.token,
        value: '0x00',
        data: transferHash + abi
    }, next);
})


