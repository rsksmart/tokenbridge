
const bridges = require('../lib/contracts/bridge');
const rskapi = require('rskapi');
const simpleabi = require('simpleabi');

const getMappedAddressHash = '0x96e609f8';

exports['create bridge instance'] = function (test) {
    const host = rskapi.host(createProvider());
    const bridge = bridges.bridge(host, '0x0102');
    
    test.ok(bridge);
    test.equal(typeof bridge, 'object');
    test.equal(bridge.address, '0x0102');
    test.equal(bridge.host, host);
}

exports['get mapped address'] = async function (test) {
    const address = '0x1111';
    const provider = createProvider();
    
    provider.eth_call = function (tx) {
        test.ok(tx.data);
        test.equal(tx.data.length, 2 + 8 + 64);
        test.ok(tx.data.startsWith(getMappedAddressHash));
        test.equal(tx.data, getMappedAddressHash + simpleabi.encodeValue(address));
        return '0x2222';
    };
    
    const host = rskapi.host(provider);
    const bridge = bridges.bridge(host, '0x0102');
    
    const result = await bridge.getMappedAddress(address, { from: '0x0304' });
    
    test.ok(result);
    test.equal(result, '0x2222');
    test.done();
};

function createProvider() {
	return {
		call: function (method, args, cb) {
			cb(null, this[method].apply(this,args));
		}
	}
}

