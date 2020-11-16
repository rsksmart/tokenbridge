const fs = require('fs');
module.exports = {
    mainchain: require('./development.json'),//require('./rsktestnet.json'),//require('./ethmainnet.json'),//
    sidechain: require('./rskregtest.json'),//require('./kovan.json'),//require('./rskmainnet.json'),//
    runEvery: 2, // In minutes,
    privateKey: '',//fs.readFileSync(`${__dirname}/federator.key`, 'utf8'),
    storagePath: './db'
}