
const rskapi = require('rskapi');
const txs = require('./lib/txs');

const transferHash = '0xa9059cbb';

const chainname = process.argv[2];
const fromAccount = process.argv[3];
const toAccount = process.argv[4];
const amount = parseInt(process.argv[5]);

const config = require('../' + chainname + 'conf.json');
const host = rskapi.host(condig.host);

const balanceOfHash = '0x70a08231';

console.log('chain', chainname);
console.log('token', config.token);
console.log('manager', config.manager);
if (config.bridge)
    console.log('bridge', config.bridge);

console.log();

(async function () {
    try {
        let accounts = config.accounts;

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

        const transferArgs = [ toAcc, amount ];
        const txhash = await txs.invokeContract(host, config.token, transferHash, transferArgs,
            { from:accounts[fromAccount] });

        console.log("tx hash", txhash);
    } catch (err) {
        console.error('ERROR', err);
    }
})();
