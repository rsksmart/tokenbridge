
const rskapi = require('rskapi');

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function toHex(number) {
	if (typeof number !== 'number')
        return;

	var text = number.toString(16);
    
    if (text.length % 2)
        text = '0' + text;
    
	return '0x' + text;
}

function getLogs(host, token, options, cb) {
    if (typeof options.from === 'number')
        options.from = toHex(options.from);
    
    if (typeof options.to === 'number')
        options.to = toHex(options.to);
    
    var filter = {
        fromBlock: options.from || "0x01",
        toBlock: options.to || "latest",
        address: token,
        topics: [ transferEventHash ]
    };
    
    return host.provider().call('eth_getLogs', [ filter ], cb);
}

module.exports = {
    getLogs: getLogs
}

