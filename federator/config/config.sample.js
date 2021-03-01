const fs = require('fs');
module.exports = {
    mainchain: require('./rsktestnet-kovan.json'), //the json containing the smart contract addresses in rsk
    sidechain: require('./kovan.json'), //the json containing the smart contract addresses in eth
    runEvery: 2, // In minutes,
    confirmations: 120, // Number of blocks before processing it, if working with ganache set as 0
    privateKey: fs.readFileSync(`${__dirname}/federator.key`, 'utf8'),
    storagePath: './db',
    etherscanApiKey: '',
}
