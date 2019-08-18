
const rskapi = require('rskapi');
const sabi = require('simpleabi');
const txs = require('./lib/txs');

const transferHash = '0xa9059cbb';
const approveHash = '0x095ea7b3';
const transferFromHash = '0x23b872dd';

const chainname = process.argv[2];

const fromAccount = process.argv[3];
const toAccount = process.argv[4];
const amount = parseInt(process.argv[5]);

const config = require('../' + chainname + 'conf.json');
const host = rskapi.host(config.host);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);
console.log('manager', config.manager);

if (config.bridge)
    console.log('bridge', config.bridge);

console.log();

(async function () {
    const accounts = config.accounts;

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

    const abi = sabi.encodeValues([ toAcc.address ? toAcc.address : toAcc, amount ]);
    
    console.log('data', abi);
    
    const txhash = await txs.invoke(
        host,
        config.token,
        transferHash,
        [ toAcc.address ? toAcc.address : toAcc, amount ],
        {
             from: accounts[fromAccount],
             gasPrice: 60000000        
        }
    );
    
    console.log("tx hash", txhash);
    
    let receipt = await host.getTransactionReceiptByHash(txhash);
    
    while (!receipt)
        receipt = await host.getTransactionReceiptByHash(txhash);    
})();
