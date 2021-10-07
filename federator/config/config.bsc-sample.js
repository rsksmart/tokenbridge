const fs = require('fs');
module.exports = {
    mainchain: require('./bchforbscmainnet.json'), //the json containing the smart contract addresses in rsk
    sidechain: require('./bscmainnet.json'), //the json containing the smart contract addresses in eth
    runEvery: 1, // In minutes,
    confirmations: 120, // Number of blocks before processing it, if working with gaanache set as 0
    privateKey: '<your-private-key-here>',
    storagePath: './db',
    runHeartbeatEvery: 1, // In hours
    endpointsPort: 5000, // Server port
}
