
const rskapi = require('rskapi');
const sabi = require('simpleabi');

const events = require('./lib/events');
const config = require('./config.json');
const bridges = require('./lib/contracts/bridge');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';
const lastBlockNumberHash = '0x941ee20b';
const getMappedAddressHash = '0x96e609f8';

const fromchainname = process.argv[2];
const tochainname = process.argv[3];
const nofederator = process.argv[4];

const fromconfig = require('../' + fromchainname + 'conf.json');
const fromhost = rskapi.host(fromconfig.host);

const bridge = bridges.bridge(fromhost, fromconfig.bridge);

console.log('from chain', fromchainname);
console.log('from host', fromconfig.host);
console.log('from token', fromconfig.token);

const toconfig = require('../' + tochainname + 'conf.json');
const tohost = rskapi.host(toconfig.host);

const federator = toconfig.members[nofederator];
        
console.log('to chain', tochainname);
console.log('to host', toconfig.host);
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
    
    await processLogs(logs, toconfig.manager); 
})();

async function processLogs(logs, manager) {
    bridgeAddress = '0x' + sabi.encodeValue(bridge.address);
    
    console.log('bridge address', bridgeAddress);
    
    var k = 0;
    
    for (var k = 0; k < logs.length; k++)
        await processLog(logs[k]);
    
    async function processLog(log) {
        if (log.topics[2] !== bridgeAddress)
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

        console.log('get mapped');
        const receiver = await bridge.getMappedAddress(originalReceiver, { from: fromconfig.accounts[0] });
        console.log('receiver', receiver);
        
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

