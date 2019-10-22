const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {};

methods.transactionCount = () => ({
    call: () => defaults.data.transactionCount
});

methods.getTransactionIds = () => ({
    call: () => defaults.data.transactionIds
});

methods.confirmations = () => ({
    call: () => defaults.data.confirmations
});

methods.confirmTransaction = () => ({
    encodeABI: () => Promise.resolve('0x0')
});

class MultiSig extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }
}

module.exports = MultiSig;
