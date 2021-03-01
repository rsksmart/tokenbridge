//We are actually gona use Bridge_v1 but truffle only knows the address of the proxy by using Bridge_v0
const BridgeProxy = artifacts.require("BridgeProxy");
const MainToken = artifacts.require('MainToken');
const Federation = artifacts.require('Federation');
const AllowTokens = artifacts.require("AllowTokens");
const MultiSigWallet = artifacts.require("MultiSigWallet");

const fs = require('fs');
const toWei = web3.utils.toWei;

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet') &&
        !network.toLowerCase().includes('kovan') &&
        !network.toLowerCase().includes('testnet');
}

module.exports = async function(deployer, networkName, accounts) {

    if (networkName === 'soliditycoverage') {
        return;
    }
    const bridgeProxy = await BridgeProxy.deployed();
    const federation = await Federation.deployed();
    const multiSig = await MultiSigWallet.deployed();
    const allowTokens = await AllowTokens.deployed();
    const currentProvider = deployer.networks[networkName];
    const config = {
        bridge: bridgeProxy.address.toLowerCase(),
        federation: federation.address.toLowerCase(),
        multiSig: multiSig.address.toLowerCase(),
        allowTokens: allowTokens.address.toLowerCase()
    };
    if(shouldDeployToken(networkName)) {
        const mainToken = await MainToken.deployed();
        config.testToken = mainToken.address.toLowerCase();
        let data = allowTokens.contract.methods.addTokenType('MAIN', toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
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