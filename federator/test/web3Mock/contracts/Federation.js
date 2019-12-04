const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {};

methods.getTransactionId = () => ({
    call: () => Promise.resolve(defaults.data.transactionIds[0])
});

methods.transactionWasProcessed = () => ({
    call: () => Promise.resolve(false)
});

methods.hasVoted = () => ({
    call: () => Promise.resolve(false)
});

methods.voteTransaction = () => ({
    encodeABI: () => Promise.resolve('0x0')
});

class Federation extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }

    getPastEvents() {
        return Promise.resolve(defaults.data.pastEvent);
    }
}

module.exports = Federation;
