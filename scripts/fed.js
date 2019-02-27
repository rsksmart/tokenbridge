
const rskapi = require('rskapi');
const sabi = require('simpleabi');

const events = require('./lib/events');
const config = require('./config.json');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';
const lastBlockNumberHash = '0x941ee20b';
const getMappedAddressHash = '0x96e609f8';

const fromchainname = process.argv[2];
const fromchain = process.argv[3];
const tochainname = process.argv[4];
const tochain = process.argv[5];
const nofederator = process.argv[6];

const fromconfig = require('../bridge/' + fromchainname + 'conf.json');
const fromhost = rskapi.host(fromchain);

console.log('from chain', fromchainname);
console.log('from token', fromconfig.token);

const toconfig = require('../bridge/' + tochainname + 'conf.json');
const tohost = rskapi.host(tochain);

const federator = toconfig.members[nofederator];
        
console.log('to chain', tochainname);
console.log('to token', toconfig.token);

console.log();

(async function() { 
    const number = await fromhost.getBlockNumber();
    const toBlock = number - config.confirmations;
     
    if (toBlock <= 0)
        return; 
    
    const lastBlockNumberVoted = parseInt(
        await tohost.callTransaction({
            from: federator,
            to: toconfig.manager,
            value: '0x00',
            data: lastBlockNumberHash + sabi.encodeValue(federator)
        })
        );
        
    const options = { to: toBlock };
        
    if (lastBlockNumberVoted)
        options.from = lastBlockNumberVoted - config.confirmations;
        
    const logs = await events.getLogs(fromhost, fromconfig.token, { to: toBlock });
    
    await processLogs(logs, fromconfig.bridge || fromconfig.manager, toconfig.manager); 
})();

async function processLogs(logs, bridge, manager) {
    bridge = '0x' + sabi.encodeValue(bridge);
    
    console.log('bridge', bridge);
    
    var k = 0;
    
    for (var k = 0; k < logs.length; k++)
        await processLog(logs[k]);
    
    async function processLog(log) {
        if (log.topics[2] !== bridge)
            return;

        // TODO remove/replace this hack
        if (parseInt(log.data) === 10000000)
            return;

        console.log();
        console.log('transfer', log.topics[1], log.topics[2], parseInt(log.data));
        console.log('block number', log.blockNumber);
        console.log('block hash', log.blockHash);
        console.log('transaction hash', log.transactionHash);

        const originalReceiver = log.topics[1];

        const receiver = await tohost.callTransaction({
                from: fromconfig.accounts[0],
                to: fromconfig.bridge,
                value: '0x00',
                data: getMappedAddressHash + sabi.encodeValue(originalReceiver)
            });
        
        const abi = sabi.encodeValues([
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            log.data
        ]);
        
        console.log(abi);
        console.log();
        
        var m = 0;

        const data = parseInt(
            await tohost.callTransaction({
                from: toconfig.accounts[0],
                to: toconfig.manager,
                value: '0x00',
                data: transactionWasProcessedHash + abi
            })); 
        
        if (data) {
            console.log('transaction event already processed');
            return;
        }
        
        await tohost.sendTransaction({
            from: federator,
            to: toconfig.manager,
            value: '0x00',
            gas: 6700000,
            data: voteTransactionHash + abi
        });
        
        console.log("voted");
    }
}

