
const rskapi = require('rskapi');
const sasync = require('simpleasync');

const chainname = process.argv[2];
const chain = process.argv[3];

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
    var n = 0;
    
    accounts = config.accounts;
    
    if (config.token)
        accounts.push(config.token);
    if (config.manager)
        accounts.push(config.manager);
    if (config.bridge)
        accounts.push(config.bridge);
    
    doGetBalance();
    
    function doGetBalance() {
        if (n >= accounts.length) {
            console.log();
            return next(null, null);
        }
        
        const account = accounts[n++];
        
        host.callTransaction({
            from: accounts[0],
            to: config.token,
            value: '0x00',
            data: balanceOfHash + "000000000000000000000000" + account.substring(2)
        }, function (err, data) {
            const balance = parseInt(data);
            
            console.log('balance', account, balance);
            
            doGetBalance();
        });
    };
})



