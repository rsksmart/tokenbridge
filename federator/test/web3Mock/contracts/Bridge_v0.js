const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {};

methods.acceptTransfer = () => ({
    encodeABI: () => Promise.resolve('0x0')
});

methods.transactionWasProcessed = () => ({
    call: () => Promise.resolve(false)
});

class Bridge extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }

    getPastEvents() {
        return Promise.resolve(defaults.data.pastEvent);
    }
}

module.exports = Bridge;
