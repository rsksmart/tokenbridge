module.exports = {
    rsk: require('./regtest.json'),
    eth: require('./development.json'),
    runEvery: 1, // In minutes,
    mmrSyncInterval: 1, // In minutes
    confirmations: 0,
    mmrBlockConfirmations: 1,
    storagePath: '/home/user/tokenbridge/submitter/db'
}