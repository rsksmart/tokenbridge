const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {};

methods.transactionCount = () => ({
    call: () => Promise.resolve(defaults.data.transactionCount)
});

methods.getTransactionId = () => ({
    call: () => Promise.resolve(defaults.data.transactionId)
});

methods.transactionWasProcessed = () => ({
    call: () => Promise.resolve(false)
});

methods.voteTransaction = () => ({
    encodeABI: () => '0x0',
    call: () => Promise.resolve(true)
});

methods.confirmations = () => ({
    call: () => Promise.resolve(defaults.data.confirmations)
});

methods.confirmTransaction = () => ({
    encodeABI: () => '0x0'
});

methods.submitTransaction = () => ({
    encodeABI: () => '0x0'
});

methods.hasVoted = () => ({
    call: () => false
});

class MultiSig extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }
}

module.exports = MultiSig;
