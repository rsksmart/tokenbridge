
const rskapi = require('rskapi');
const sasync = require('simpleasync');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function getLogs(host, token, options, cb) {
    var filter = {
        fromBlock: options.from || "0x01",
        toBlock: options.to || "latest",
        address: token,
        topics: [ transferEventHash ]
    };
    
    host.provider.call('eth_getLogs', filter, cb);
}

module.exports = {
    getLogs: getLogs
}

