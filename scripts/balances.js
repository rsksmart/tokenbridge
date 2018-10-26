
const rskapi = require('rskapi');
const sasync = require('simpleasync');

const chainname = process.argv[2];
const chain = process.argv[3];

const config = require('../bridge/' + chainname + 'conf.json');
const host = rskapi.host(chain);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);

var accounts;

sasync()
.exec(function (next) {
    host.getAccounts(next);
})
.then(function (data, next) {    
    var n = 0;
    
    accounts = data;
    
    if (config.token)
        accounts.push(config.token);
    if (config.manager)
        accounts.push(config.manager);
    if (config.bridge)
        accounts.push(config.bridge);
    
    doGetBalance();
    
    function doGetBalance() {
        if (n >= accounts.length)
            return next(null, null);
        
        const account = accounts[n++];
        
        host.callTransaction({
            from: accounts[0],
            to: config.token,
            value: '0x00',
            data: balanceOfHash + "000000000000000000000000" + account.substring(2)
        }, function (err, data) {
            console.log('balance', account, parseInt(data));
            doGetBalance();
        });
    };
})


