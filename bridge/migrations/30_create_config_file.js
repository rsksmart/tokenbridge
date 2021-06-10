const MainToken = artifacts.require('MainToken');
const AllowTokens = artifacts.require("AllowTokens");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const deployHelper = require("../deployed/deployHelper");

const fs = require('fs');
const toWei = web3.utils.toWei;

module.exports = async function(deployer, networkName, accounts) {

    if (networkName === 'soliditycoverage') {
        return;
    }
    const deployedJson = deployHelper.getDeployed(networkName);
    const currentProvider = deployer.networks[networkName];

    const config = {
        bridge: deployedJson.BridgeProxy.toLowerCase(),
        federation: deployedJson.FederationProxy.toLowerCase(),
        multiSig: deployedJson.MultiSig.toLowerCase(),
        allowTokens: deployedJson.AllowTokensProxy.toLowerCase()
    };
    if(deployHelper.isLocalNetwork(networkName)) {
        const multiSig = await MultiSigWallet.at(deployedJson.MultiSig);
        const mainToken = await MainToken.deployed(deployedJson.MainToken);
        config.testToken = mainToken.address.toLowerCase();
        const allowTokens = await AllowTokens.at(deployedJson.AllowTokensProxy);
        let data = allowTokens.contract.methods.addTokenType('MAIN', {max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
        await multiSig.submitTransaction(allowTokens.address, 0, data, { from: accounts[0] });
        let typeId = 0;
        data = allowTokens.contract.methods.setToken(mainToken.address, typeId).encodeABI();
        await multiSig.submitTransaction(allowTokens.address, 0, data, { from: accounts[0] });

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