//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v1 = artifacts.require("Bridge_v1");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const proxyAdminAbi = require('../../abis/ProxyAdmin.json');

// //example https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/examples/truffle-migrate/migrations
// async function ozDeploy(options, name, alias, initArgs) {
//     try {
//         // Register v0 of MyContract in the zos project
//         scripts.add({ contractsData: [{ name: name, alias: alias }] });
//         // Push implementation contracts to the network
//         let result = await scripts.push(options);
//         console.log(result)

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
        const bridgeProxy = await Bridge.deployed();

        // const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });

        // if (networkName === 'soliditycoverage') {
        //     //soldity coverage doesn't play along with oppen zeppelin sdk
        //     //so we deploy the un initialized contract just to create the objects
        //     return deployer
        //        .deploy(Bridge_v1);
        // }

        // await ozDeploy({ network, txParams }, 'Bridge_v1', 'Bridge');

        const networkConfig = require(`../.openzeppelin/dev-${await web3.eth.net.getId()}.json`);
        console.log(networkConfig);
        const proxyAdmin = new web3.eth.Contract(proxyAdminAbi, networkConfig.proxyAdmin.address);

        let bridge_v1 = await deployer.deploy(Bridge_v1);
        console.log(bridgeProxy.address);
        console.log(bridge_v1.address);
        console.log(proxyAdmin.options.address);


        const data = proxyAdmin.methods.upgrade(bridgeProxy.address, bridge_v1.address).encodeABI();
        await multiSig.submitTransaction(proxyAdmin.options.address, 0, data, { from: accounts[0] });
      });
};