//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v1 = artifacts.require("Bridge_v1");
const adminProxiAbi = require("../../abis/AdminUpgradeabilityProxy.json");
const MultiSigWallet = artifacts.require("MultiSigWallet");

//example https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/examples/truffle-migrate/migrations
// async function ozDeploy(options, name, alias, initArgs) {
//     try {
//         // Register v0 of MyContract in the zos project
//         scripts.add({ contractsData: [{ name: name, alias: alias }] });

//         // Push implementation contracts to the network
//         await scripts.push(options);

//         // Create an instance of MyContract, setting initial values
//         await scripts.update(Object.assign({ contractAlias: alias}, options));
//     } catch (err) {
//         throw new Error(`Error on oz deployment ${err.stack}`);
//     }
// }

module.exports = function(deployer, networkName, accounts) {
    let symbol = 'e';

    if(networkName == 'rskregtest' || networkName == 'rsktestnet' || networkName == 'rskmainnet')
        symbol = 'r';

    return deployer.then(async () => {
        const multiSig = await MultiSigWallet.deployed();
        const bridge = await Bridge.deployed();

        let bridge_v1 = await deployer.deploy(Bridge_v1);

        const proxy = new web3.eth.Contract(adminProxiAbi, bridge.address);
        let data = proxy.methods.upgradeTo(bridge_v1.address).encodeABI();
        await multiSig.submitTransaction(bridge.address, 0, data, { from: accounts[0] });

        //const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });

        //if (networkName === 'soliditycoverage') {
            //soldity coverage doesn't play along with oppen zeppelin sdk
            //so we deploy the un initialized contract just to create the objects
            //return deployer
            //    .deploy(Bridge_v1);
        //}

        //await ozDeploy({ network, txParams }, 'Bridge_v1', 'Bridge');
      });
};