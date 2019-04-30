const fs = require('fs');
const promisify = require('./test/utils').promisify;

const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

const config = require('../mainconf.json');

async function run() {
    const manager = await FederatedManager.at(config.manager);

    console.log('Bridge configuration...');
    await manager.setTransferable(config.bridge);
    console.log('Bridge controlled by Manager');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}