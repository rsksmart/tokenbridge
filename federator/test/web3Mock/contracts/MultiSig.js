const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {};

methods.transactionCount = () => ({
    call: () => Promise.resolve(defaults.data.transactionCount)
});

methods.getTransactionIds = () => ({
    call: () => Promise.resolve(defaults.data.transactionIds)
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

class MultiSig extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }
}

module.exports = MultiSig;
