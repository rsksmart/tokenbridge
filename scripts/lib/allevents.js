
const rskapi = require('rskapi');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function getLogs(host, token, options, cb) {
    var filter = {
        fromBlock: options.from || "0x01",
        toBlock: options.to || "latest"
    };
    
    return host.provider().call('eth_getLogs', [ filter ], cb);
}

module.exports = {
    getLogs: getLogs
}

