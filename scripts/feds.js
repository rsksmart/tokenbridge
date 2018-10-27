
const rskapi = require('rskapi');
const sasync = require('simpleasync');
const sabi = require('simpleabi');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';

const fromchainname = process.argv[2];
const fromchain = process.argv[3];
const tochainname = process.argv[4];
const tochain = process.argv[5];

const fromconfig = require('../bridge/' + fromchainname + 'conf.json');
const fromhost = rskapi.host(fromchain);

console.log('from chain', fromchainname);
console.log('from token', fromconfig.token);

const toconfig = require('../bridge/' + tochainname + 'conf.json');
const tohost = rskapi.host(tochain);

console.log('to chain', tochainname);
console.log('to token', toconfig.token);

console.log();

sasync()
.exec(function (next) {
    fromhost.provider().call('eth_getLogs', [{ fromBlock: "0x01", toBlock: "latest",
        address: fromconfig.token,
        topics: [ transferEventHash ]
    }], next);
})
.then(function (data, next) {
    processLogs(data, fromconfig.bridge || fromconfig.manager, toconfig.manager, next);
})
.error(function (err) {
    console.log(err);
});

function processLogs(logs, bridge, manager, cb) {
    bridge = '0x' + sabi.encodeValue(bridge);
    
    console.log('bridge', bridge);
    
    var k = 0;
    
    processLog();
    
    function processLog() {
        if (k >= logs.length)
            return cb(null, null);

        var log = logs[k++];
        
        if (log.topics[2] !== bridge)
            return setTimeout(processLog, 0);

        console.log();
        console.log('transfer', log.topics[1], log.topics[2], parseInt(log.data));
        console.log('block number', log.blockNumber);
        console.log('block hash', log.blockHash);
        console.log('transaction hash', log.transactionHash);
        
        const abi = sabi.encodeValues([
            log.blockNumber,
            log.blockHash,
            log.transactionHash,
            log.topics[1],
            log.data
        ]);
        
        console.log(abi);
        console.log();
        
        var m = 0;

        tohost.callTransaction({
            from: toconfig.accounts[0],
            to: toconfig.manager,
            value: '0x00',
            data: transactionWasProcessedHash + abi
        }, function (err, data) {
            if (err)
                return cb(err, null);
            
            data = parseInt(data);
            
            if (!data) {
                console.log('process transaction event');
                processVote();
            }
            else {
                console.log('transaction event already processed');
                return processLog();
            }
        });
        
        function processVote() {
            if (m >= toconfig.members.length)
                return processLog();
        
            const member = toconfig.members[m++];
            
            tohost.sendTransaction({
                from: member,
                to: toconfig.manager,
                value: '0x00',
                gas: 6700000,
                data: voteTransactionHash + abi
            }, function (err, data) { console.log('voted'); setTimeout(processVote, 1000); });
        }
    }
}

