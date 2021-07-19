const MainToken = artifacts.require('MainToken');
const AllowTokens_old = artifacts.require("AllowTokens_old");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const deployHelper = require("../deployed/deployHelper");

const fs = require('fs');

module.exports = async function(deployer, networkName, accounts) {

    if (networkName === 'soliditycoverage') {
        return;
    }
    const deployedJson = deployHelper.getDeployed(networkName);
    const currentProvider = deployer.networks[networkName];

    const config = {
        bridge: deployedJson.BridgeProxy.toLowerCase(),
        federation: deployedJson.Federation.toLowerCase(),
        multiSig: deployedJson.MultiSig.toLowerCase(),
        allowTokens: deployedJson.AllowTokens.toLowerCase()
    };
    if (deployHelper.isLocalNetwork(networkName)) {
        const multiSig = await MultiSigWallet.deployed();
        const mainToken = await MainToken.deployed();
        config.testToken = mainToken.address.toLowerCase();

        const allowTokens_old = await AllowTokens_old.deployed();
        const data = allowTokens_old.contract.methods.addAllowedToken(mainToken.address).encodeABI();
        await multiSig.submitTransaction(allowTokens_old.address, 0, data, { from: accounts[0] });

        // Uncomment below lines to use multiple federators
        // await multiSig.confirmTransaction(0, { from: accounts[1] });
        // await multiSig.confirmTransaction(0, { from: accounts[2] });
    }
    if (currentProvider.host) {
        let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
        host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
        config.host = host;
    } else {
        config.host = '';
    }
    config.fromBlock = await web3.eth.getBlockNumber();
    fs.writeFileSync(`../federator/config/${networkName}.json`, JSON.stringify(config, null, 4));

};