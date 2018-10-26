
const rskapi = require('rskapi');
const sasync = require('simpleasync');

const chainname = process.argv[2];
const chain = process.argv[3];

const config = require('../bridge/' + chainname + 'conf.json');
const host = rskapi.host(chain);

console.log('chain', chainname);
console.log('token', config.token);

sasync()
.exec(function (next) {
    console.log('get logs');
    host.provider().call('eth_getLogs', [{ fromBlock: "0x01", toBlock: "latest",
        address: config.token,
        topics: [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' ]
    }], next);
})
.then(function (data, next) {
    for (var k = 0; k < data.length; k++) {
        var log = data[k];
        console.log('transfer', log.topics[1], log.topics[2], parseInt(log.data));
    }
})
.error(function (err) {
    console.log(err);
});


