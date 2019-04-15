
const rskapi = require('rskapi');
const sabi = require('simpleabi');

const events = require('./lib/events');
const config = require('./config.json');
const Bridge = require('./lib/contracts/bridge');
const Manager = require('./lib/contracts/manager');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const fromchainname = process.argv[2];
const tochainname = process.argv[3];
const nofederator = process.argv[4];

const fromconfig = require('../' + fromchainname + 'conf.json');
const fromhost = rskapi.host(fromconfig.host);

const bridge = Bridge.bridge(fromhost, fromconfig.bridge);

console.log('from chain', fromchainname);
console.log('from host', fromconfig.host);
console.log('from token', fromconfig.token);

const toconfig = require('../' + tochainname + 'conf.json');
const tohost = rskapi.host(toconfig.host);

const manager = Manager.manager(tohost, toconfig.manager);

const federator = toconfig.members[nofederator];
const federatorAddress = federator.address ? federator.address : federator;
        
console.log('to chain', tochainname);
console.log('to host', toconfig.host);
console.log('to token', toconfig.token);

console.log();

(async function() { 
    const number = await fromhost.getBlockNumber();
    const toBlock = number - config.confirmations;
     
    if (toBlock <= 0)
        return; 
    
    const lastBlockNumberVoted = parseInt(await manager.lastBlockNumber(federatorAddress, { from: federatorAddress }));

    
    const options = { to: toBlock };
        
    if (lastBlockNumberVoted)
        options.from = lastBlockNumberVoted - config.confirmations;
        
    const logs = await events.getLogs(fromhost, fromconfig.token, options);
    
    await processLogs(logs); 
})();

async function processLogs(logs) {
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
        
        var m = 0;

        const data = parseInt(await manager.transactionWasProcessed(
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            log.data,
            { from: toconfig.accounts[0] }));
        
        if (data) {
            console.log('transaction event already processed');
            return;
        }

        await manager.voteTransaction(
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            log.data,
            { from: federator });
        
        console.log("voted");
    }
}

