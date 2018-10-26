const fs = require('fs');

const FederatedManager = artifacts.require('./FederatedManager');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');

// from https://ethereum.stackexchange.com/questions/11444/web3-js-with-promisified-api

const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }

      resolve(res);
    })
);

async function run() {
    const accounts = await promisify(cb => web3.eth.getAccounts(cb));
    console.dir(accounts);

    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];

    const manager = await FederatedManager.new(members);
    console.log('Manager deployed at', manager.address);
    
    const token = await SideToken.new("SIDE", "SIDE", 18, manager.address);
    console.log('SideToken deployed at', token.address);

    await manager.setTransferable(token.address);
    console.log('SideToken controlled by Manager');
    
    const config = {
        accounts: accounts,
        token: token.address,
        manager: manager.address,
        members: members
    };
    
    fs.writeFileSync('sideconf.json', JSON.stringify(config, null, 4));
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}

