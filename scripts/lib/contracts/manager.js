
const simpleabi = require('simpleabi');

const lastBlockNumberHash = '0x941ee20b';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';

function Manager(host, address) {
    this.host = host;
    this.address = address;
    
    this.lastBlockNumber = async function (addr, options) {
        return await host.callTransaction({
            from: options.from,
            to: address,
            value: options.value || 0,
            gas: options.gas || 1000000,
            gasPrice: options.gasPrice || 0,
            data: lastBlockNumberHash + simpleabi.encodeValue(addr)
        });
    };

    this.voteTransaction = async function (noblock, blockhash, txhash, receiver, amount, options) {
        return await host.sendTransaction({
            from: options.from,
            to: address,
            value: options.value || 0,
            gas: options.gas || 1000000,
            gasPrice: options.gasPrice || 0,
            data: voteTransactionHash + simpleabi.encodeValues([ noblock, blockhash, txhash, receiver, amount ])
        });
    };

    this.transactionWasProcessed = async function (noblock, blockhash, txhash, receiver, amount, options) {
        return await host.callTransaction({
            from: options.from,
            to: address,
            value: options.value || 0,
            gas: options.gas || 1000000,
            gasPrice: options.gasPrice || 0,
            data: transactionWasProcessedHash + simpleabi.encodeValues([ noblock, blockhash, txhash, receiver, amount ])
        });
    };
}

function createManager(host, address) {
    return new Manager(host, address);
}

module.exports = {
    manager: createManager
}

