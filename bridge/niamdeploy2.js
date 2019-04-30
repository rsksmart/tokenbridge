const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

const config = require('../sideconf.json');

async function run() {
    const manager = await FederatedManager.at(config.manager);
    const token = await MainToken.at(config.token);

    console.log('Bridge configuration...');
    await manager.setTransferable(config.bridge);
    console.log('Bridge controlled by Manager');
    
    console.log('Bridge supply...');
    await token.transfer(config.bridge, 10000000);
    console.log('Bridge has token total supply');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}