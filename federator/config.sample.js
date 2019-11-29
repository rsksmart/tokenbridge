module.exports = {
    mainchain: require('./rskregtest.json'),
    sidechain: require('./development.json'),
    runEvery: 1, // In minutes,
    confirmations: 120, //if working with ganache set as 0
    privateKey: '',
    storagePath: '/Users/Me/tokenbridge/federator/db'
}