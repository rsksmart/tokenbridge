const MultiSig = require('./contracts/MultiSig');
const Bridge = require('./contracts/Bridge_v0');
const config = require('../../config.js');

const mappings = {
    [config.mainchain.multisig]: MultiSig,
    [config.sidechain.multisig]: MultiSig,
    [config.sidechain.bridge]: Bridge,
    [config.mainchain.bridge]: Bridge,
};

function contractMapping(_, address) {
    let MockContract = mappings[address];
    if (!MockContract) {
        throw new Error('Mock implementation not found');
    }

    return new MockContract();
}

module.exports = contractMapping;
