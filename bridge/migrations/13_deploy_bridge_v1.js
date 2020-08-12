//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v1 = artifacts.require("Bridge_v1");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Utils = artifacts.require("Utils");
const proxyAdminAbi = require('../../abis/ProxyAdmin.json');


module.exports = function(deployer, networkName, accounts) {
    return deployer.deploy(Utils)
    .then( () => {
        return deployer.link(Utils, Bridge_v1);
    }).then( () => {
        return deployer.deploy(Bridge_v1);
    }).then(async (bridge_v1) => {
        const multiSig = await MultiSigWallet.deployed();
        const bridgeProxy = await Bridge.deployed();
        // const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });

        // await ozDeploy({ network, txParams }, 'Bridge_v1', 'Bridge');
        if (networkName === 'soliditycoverage') {
            return bridge_v1;
        }
        let jsonName = networkName;
        const chainId = await web3.eth.net.getId();
        if((chainId >= 30 && chainId <=33) || chainId == 5777) {
            jsonName = `dev-${chainId}`;
        }
        const networkConfig = require(`../.openzeppelin/${jsonName}.json`);

        const proxyAdminAddress = networkConfig.proxyAdmin.address;
        const proxyAdmin = new web3.eth.Contract(proxyAdminAbi, proxyAdminAddress);
        
        const data = proxyAdmin.methods.upgrade(bridgeProxy.address, bridge_v1.address).encodeABI();
        await multiSig.submitTransaction(proxyAdmin.options.address, 0, data, { from: accounts[0] });
      });
};