module.exports = {
    rsk: require('./regtest.json'),
    eth: require('./development.json'),
    runEvery: 1, // In minutes,
    mmrSyncInterval: 1, // In minutes
    confirmations: 3,
    mmrBlockConfirmations: 2,
    storagePath: '/home/user/tokenbridge/submitter/db'
}