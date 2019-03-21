
const rskapi = require('rskapi');
const simpleabi = require('simpleabi');
const txs = require('./lib/txs');

const chainname = process.argv[2];
const amount = parseInt(process.argv[3]);

const config = require('../' + chainname + 'conf.json');
const host = rskapi.host(config.host);

async function transferToAccount(host, sender, account, amount) {
    const address = account.address ? account.address : account;
    
    console.log('transferring', amount, 'weis to', address);
    
    await txs.transfer(host, address, amount, { from: sender });
}

(async function() {
    const accounts = await host.getAccounts();
    const sender = accounts[0];
    
    for (let k = 0; k < config.accounts.length; k++)
        await transferToAccount(host, sender, config.accounts[k], amount);
    
    for (let k = 0; k < config.members.length; k++)
        await transferToAccount(host, sender, config.members[k], amount);
})();

