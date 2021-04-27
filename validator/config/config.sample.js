const fs = require('fs');
module.exports = {
    mainchain: require('./rsktestnet-kovan.json'), //the json containing the smart contract addresses in rsk
    sidechain: require('./kovan.json'), //the json containing the smart contract addresses in eth
    runEvery: 2, // In minutes,
    privateKey: fs.readFileSync(`${__dirname}/validators.key`, 'utf8'),
    storagePath: './db'
}