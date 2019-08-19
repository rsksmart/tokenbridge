const txs = require('../txs');

const lastBlockNumberHash = '0x941ee20b';
const voteTransactionHash = '0x6bcab28b';
const transactionWasProcessedHash = '0x4228f915';

function Manager(host, address) {
    this.host = host;
    this.address = address;
    
    this.lastBlockNumber = async function (addr, options) {
        return await txs.call(
            host,
            address,
            lastBlockNumberHash,
            [ addr ],
            options
        );
    };

    this.voteTransactionTest = async function (noblock, blockhash, txhash, receiver, amount, options) {
        return await txs.call(
            host,
            address,
            voteTransactionHash,
            [ noblock, blockhash, txhash, receiver, amount ],
            options
        );
    };

    this.voteTransaction = async function (noblock, blockhash, txhash, receiver, amount, options) {
        return await txs.invoke(
            host,
            address,
            voteTransactionHash,
            [ noblock, blockhash, txhash, receiver, amount ],
            options
        );
    };

    this.transactionWasProcessed = async function (noblock, blockhash, txhash, receiver, amount, options) {
        return await txs.call(
            host,
            address,
            transactionWasProcessedHash,
            [ noblock, blockhash, txhash, receiver, amount ],
            options
        );
    };
}

function createManager(host, address) {
    return new Manager(host, address);
}

module.exports = {
    manager: createManager
}

