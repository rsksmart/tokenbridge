
const rskapi = require('rskapi');
const sasync = require('simpleasync');
const sabi = require('simpleabi');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

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

sasync()
.exec(function (next) {
    fromhost.provider().call('eth_getLogs', [{ fromBlock: "0x01", toBlock: "latest",
        address: fromconfig.token,
        topics: [ transferEventHash ]
    }], next);
})
.then(function (data, next) {
    processLogs(data, fromconfig.bridge || fromconfig.manager, toconfig.manager);
})
.error(function (err) {
    console.log(err);
});

function processLogs(logs, bridge, manager) {
    bridge = '0x' + sabi.encodeValue(bridge);
    
    console.log('bridge', bridge);
    
    for (var k = 0; k < logs.length; k++) {
        var log = logs[k];
        
        //if (log.topics[2] !== bridge)
        //    continue;
        
        console.log('transfer', log.topics[1], log.topics[2], parseInt(log.data));
    }
}

