module.exports = {
    rsk: require('./regtest.json'),
    eth: require('./development.json'),
    runEvery: 1, // In minutes,
    mmrSyncInterval: 30, // In minutes
    confirmations: 0,
    mmrBlockConfirmations: 10,
    storagePath: '/home/user/tokenbridge/submitter/db'
}