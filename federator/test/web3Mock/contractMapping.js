const Federation = require('./contracts/Federation');
const Bridge = require('./contracts/Bridge_v0');
const config = require('../../config.js');

const mappings = {
    [config.mainchain.federation]: Federation,
    [config.sidechain.federation]: Federation,
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
