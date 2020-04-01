const { scripts, ConfigManager } = require('@openzeppelin/cli');
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Federation = artifacts.require("Federation_v1");
const AllowTokens = artifacts.require('AllowTokens');
const SideTokenFactory = artifacts.require('SideTokenFactory_v1');
const Bridge_v1 = artifacts.require('Bridge_v1');
const Utils = artifacts.require('Utils');

//example https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/examples/truffle-migrate/migrations
async function ozDeploy(options, name, alias, initArgs) {
    try {
        // Register v0 of MyContract in the zos project
        scripts.add({ contractsData: [{ name: name, alias: alias }] });

        // Push implementation contracts to the network
        await scripts.push(options);

        // Create an instance of MyContract, setting initial values
        await scripts.update(Object.assign({ contractAlias: alias}, options));
    } catch (err) {
        throw new Error(`Error on oz deployment ${err.stack}`);
    }
}

module.exports = function(deployer, networkName, accounts) {
    let symbol = 'e';

    if(networkName == 'rskregtest' || networkName == 'rsktestnet' || networkName == 'rskmainnet')
        symbol = 'r';

    return deployer.then(async () => {
        const utils = await Utils.new();
        await Bridge_v1.link("Utils", utils.address);
        

        const multiSig = await MultiSigWallet.deployed();
        const allowTokens = await AllowTokens.deployed();
        const sideTokenFactory = await SideTokenFactory.deployed();
        const federation = await Federation.deployed();
        const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });
        let initArgs = [ multiSig.address, federation.address, allowTokens.address, sideTokenFactory.address, symbol ];

        if (networkName === 'coverage') {
            return deployer
                .deploy(Bridge_v1, initArgs[0], initArgs[1], initArgs[2], initArgs[3], initArgs[4]);
        }

        await ozDeploy({ network, txParams }, 'Bridge_v1', 'Bridge', initArgs);
      });
};