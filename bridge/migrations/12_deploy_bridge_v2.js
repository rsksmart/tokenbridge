//const { scripts, ConfigManager } = require('@openzeppelin/cli');
const Bridge = artifacts.require("Bridge_v0");
const Bridge_v2 = artifacts.require("Bridge_v2");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const Utils = artifacts.require("Utils");
const proxyAdminAbi = require('../../abis/ProxyAdmin.json');


module.exports = async function(deployer, networkName, accounts) {
    await Bridge_v2.link(Utils, Utils.address);

    let bridge_v2 = await deployer.deploy(Bridge_v2);
    const multiSig = await MultiSigWallet.deployed();
    const bridgeProxy = await Bridge.deployed();
    // If coverage deploy directly the new contract
    if (networkName === 'soliditycoverage') {
        return bridge_v2;
    }
    // As we need the multisig to update we can't use oz to do it
    // We deploy the contract manually and point the proxy to the new logic
    let jsonName = networkName;
    const chainId = await web3.eth.net.getId();
    if((chainId >= 30 && chainId <= 33) || chainId == 5777) {
        jsonName = `dev-${chainId}`;
    }
    const networkConfig = require(`../.openzeppelin/${jsonName}.json`);

    const proxyAdminAddress = networkConfig.proxyAdmin.address;
    const proxyAdmin = new web3.eth.Contract(proxyAdminAbi, proxyAdminAddress);

    console.log("proxyAdmin.options.address", proxyAdmin.options.address)
    console.log("bridgeProxy.address", bridgeProxy.address)
    const data = proxyAdmin.methods.upgrade(bridgeProxy.address, bridge_v2.address).encodeABI();
    await multiSig.submitTransaction(proxyAdmin.options.address, 0, data, { from: accounts[0] });
};