const Federation = require('./contracts/Federation');
const Bridge = require('./contracts/Bridge');
const fs = require('fs');
const path = require('path');

const configFile = fs.readFileSync(path.join(__dirname,'../config.js'), 'utf8');
const config = JSON.parse(configFile);

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
