module.exports = {
    mainchain: require('./regtest.json'),
    sidechain: require('./development.json'),
    runEvery: 1, // In minutes,
    confirmations: 5,
    privateKey: '',
    storagePath: '/Users/Me/tokenbridge/federator/db'
}