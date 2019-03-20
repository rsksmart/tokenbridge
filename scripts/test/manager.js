
const managers = require('../lib/contracts/manager');
const rskapi = require('rskapi');
const simpleabi = require('simpleabi');

const lastBlockNumberHash = '0x941ee20b';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';

exports['create manager instance'] = function (test) {
    const host = rskapi.host(createProvider());
    const manager = managers.manager(host, '0x0102');
    
    test.ok(manager);
    test.equal(typeof manager, 'object');
    test.equal(manager.address, '0x0102');
    test.equal(manager.host, host);
}

exports['get last block number by federator'] = async function (test) {
    const provider = createProvider();
    const address = '0x0102';
    
    provider.eth_call = function (tx) {
        test.ok(tx.data);
        test.equal(tx.data.length, 2 + 8 + 64);
        test.ok(tx.data.startsWith(lastBlockNumberHash));
        test.equal(tx.data, lastBlockNumberHash + simpleabi.encodeValue(address));
        return '0x2222';
    };
    
    const host = rskapi.host(provider);
    const manager = managers.manager(host, '0x0102');
    
    const result = await manager.lastBlockNumber(address, { from: '0x0304' });
    
    test.ok(result);
    test.equal(result, '0x2222');
    test.done();
}

exports['vote transaction'] = async function (test) {
    const provider = createProvider();
    
    provider.eth_sendTransaction = function (tx) {
        test.ok(tx.data);
        test.equal(tx.data.length, 2 + 8 + 64 * 5);
        test.ok(tx.data.startsWith(voteTransactionHash));
        test.equal(tx.data, voteTransactionHash + simpleabi.encodeValues([ 1, 2, 3, 4, 5 ]));
        return '0x2222';
    };
    
    const host = rskapi.host(provider);
    const manager = managers.manager(host, '0x0102');
    
    const result = await manager.voteTransaction(1, 2, 3, 4, 5, { from: '0x0304' });
    
    test.ok(result);
    test.equal(result, '0x2222');
    test.done();
}

exports['transaction was processed'] = async function (test) {
    const provider = createProvider();
    
    provider.eth_call = function (tx) {
        test.ok(tx.data);
        test.equal(tx.data.length, 2 + 8 + 64 * 5);
        test.ok(tx.data.startsWith(transactionWasProcessedHash));
        test.equal(tx.data, transactionWasProcessedHash + simpleabi.encodeValues([ 1, 2, 3, 4, 5 ]));
        return '0x2222';
    };
    
    const host = rskapi.host(provider);
    const manager = managers.manager(host, '0x0102');
    
    const result = await manager.transactionWasProcessed(1, 2, 3, 4, 5, { from: '0x0304' });
    
    test.ok(result);
    test.equal(result, '0x2222');
    test.done();
}

function createProvider() {
	return {
		call: function (method, args, cb) {
			cb(null, this[method].apply(this,args));
		}
	}
}

