const rskapi = require('rskapi');
const sabi = require('simpleabi');
const Web3EthAbi = require('web3-eth-abi');
const BN = require('bn.js');

const events = require('./lib/events');
const Bridge = require('./lib/contracts/bridge');
const Manager = require('./lib/contracts/manager');

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

console.log('federator address', federatorAddress);
console.log('to chain', tochainname);
console.log('to host', toconfig.host);
console.log('to token', toconfig.token);


(async function() { 
    try {
        const number = await fromhost.getBlockNumber();
        const toBlock = number - fromconfig.confirmations || 0;
        console.log(`to Block: ${toBlock}`);
        if (toBlock <= 0)
            return; 
        
        const lastBlockNumberVoted = parseInt(await manager.lastBlockNumber(federatorAddress, 
            { from: federator }));
        console.log(`last Block Number voted: ${lastBlockNumberVoted}`);
        const options = { to: toBlock };
            
        if (lastBlockNumberVoted)
            options.from = lastBlockNumberVoted - toconfig.confirmations;
        else if (fromconfig.block)
            options.from = fromconfig.block;
        const logs = await events.getLogs(fromhost, fromconfig.token, options);
        
        await processLogs(logs); 
    } catch (err) {
        console.error(`[ERROR]`, err);
        process.exit(1);
    }
})();

async function processLogs(logs) {
    bridgeAddress = '0x' + sabi.encodeValue(bridge.address);
    
    console.log('bridge address', bridgeAddress);
        
    for (var k = 0; k < logs.length; k++)
        await processLog(logs[k]);
    
    async function processLog(log) {
        if (log.topics[2] !== bridgeAddress)
            return;

        // TODO remove/replace this hack 
        // this number is equal to the one in naimdeploy.js transfer from token to bridge
        const tokens = new BN(Web3EthAbi.decodeParameter('uint256', log.data));
        if (tokens == fromconfig.totalTokens)
            return;

        console.log();
        console.log('transfer from', log.topics[1]);
        console.log('transfer to', log.topics[2]);
        console.log('amount', tokens.toString());
        console.log('block number', log.blockNumber);
        console.log('block hash', log.blockHash);
        console.log('transaction hash', log.transactionHash);

        const originalReceiver = log.topics[1];

        console.log('get mapped');
        const receiver = await bridge.getMappedAddress(originalReceiver, { from: fromconfig.accounts[0] });
        console.log('receiver', receiver);
        
        console.log('Check if already procesed')

        const data = parseInt(await manager.transactionWasProcessed(
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            tokens,
            { from: federator }));

        if (data) {
            console.log('transaction event already processed');
            return;
        }
        console.log('Vote Transaction');
        
        //Do a call before the send transaction so it throws and error if something is wrong
        await manager.voteTransactionTest(
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            tokens,
            { from: federator });

        let txHash = await manager.voteTransaction(
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            receiver,
            tokens,
            { from: federator, gas: toconfig.gas, gasPrice: toconfig.gasPrice  });
        console.log('voted on tx hash:',txHash);
    }
}

