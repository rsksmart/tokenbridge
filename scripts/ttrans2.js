
const rskapi = require('rskapi');
const sabi = require('simpleabi');
const txs = require('./lib/txs');

const conf = require('./config.json');

conf.gasPrice = conf.gasPrice == null ? 0 : conf.gasPrice;

const transferHash = '0xa9059cbb';
const approveHash = '0x095ea7b3';
const transferFromHash = '0x23b872dd';
const receiveTokensHash = '0x35729130';

const chainname = process.argv[2];

const fromAccount = process.argv[3];
const amount = parseInt(process.argv[4]);

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

    const txhash = await txs.invoke(
        host,
        config.token,
        approveHash,
        [ config.bridge, amount ],
        {
             from: accounts[fromAccount],
             gas: 100000,
             gasPrice: conf.gasPrice        
        }
    );
    
    console.log("tx hash", txhash);
    
    let receipt = await host.getTransactionReceiptByHash(txhash);
    
    while (!receipt)
        receipt = await host.getTransactionReceiptByHash(txhash);    
    
    console.log(receipt);
    
    const txhash2 = await txs.invoke(
        host,
        config.bridge,
        receiveTokensHash,
        [ config.token, amount ],
        {
             from: accounts[fromAccount],
             gas: 100000,
             gasPrice: conf.gasPrice
        }
    );
    
    console.log("tx hash", txhash2);
    
    let receipt2 = await host.getTransactionReceiptByHash(txhash2);
    
    while (!receipt2)
        receipt2 = await host.getTransactionReceiptByHash(txhash2);  
    
    console.log(receipt2);
})();
