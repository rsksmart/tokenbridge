const { scripts, ConfigManager } = require('@openzeppelin/cli');
const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require('AllowTokens');

//example https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/examples/truffle-migrate/migrations
async function ozDeploy(options, name, alias, initArgs) {
    try {
        // Register v0 of MyContract in the zos project
        scripts.add({ contractsData: [{ name: name, alias: alias }] });

        // Push implementation contracts to the network
        await scripts.push(options);

        // Create an instance of MyContract, setting initial values
        await scripts.create(Object.assign({ contractAlias: alias, methodName: 'initialize', methodArgs: initArgs }, options));
    } catch (err) {
        throw new Error(`Error on oz deployment ${err.stack}`);
    }
}

module.exports = function(deployer, networkName, accounts) {
    let symbol = 'e';

    if(networkName == 'regtest' || networkName == 'testnet')
        symbol = 'r';

    deployer.then(async () => {
        const multiSig = await MultiSigWallet.deployed();
        const allowTokens = await AllowTokens.deployed();
        const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });
        let initArgs = [ multiSig.address, allowTokens.address, symbol.charCodeAt() ];
        console.log('init args ', initArgs);
        await ozDeploy({ network, txParams }, 'Bridge_v0', 'Bridge', initArgs);
      })
};