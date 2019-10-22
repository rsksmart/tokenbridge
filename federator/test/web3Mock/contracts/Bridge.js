const Contract = require('./Contract');
const defaults = require('../defaults');

const methods = {
};

class Bridge extends Contract {
    constructor() {
        super();
        this.methods = methods;
    }
}

module.exports = Bridge;
