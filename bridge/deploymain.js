const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
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
    
    const token = await MainToken.new("MAIN", "MAIN", 18, 10000);
    console.log('MainToken deployed at', token.address);
    
    const bridge = await Bridge.new(manager.address, token.address);
    console.log('Bridge deployed at', bridge.address);

    await manager.setTransferable(bridge.address);
    console.log('Bridge controlled by Manager');
}

module.exports = function (cb) {
    run().then(function () {
        console.log('done');
        cb(null, null);
    });
}