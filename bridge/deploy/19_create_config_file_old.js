const hardhatConfig = require('../hardhat.config');
const fs = require('fs');

module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()

    if (network.name === 'soliditycoverage' || network.name === 'hardhat') {
        return;
    }
    const BridgeProxy = await deployments.get('BridgeProxy');
    const Federation_old = await deployments.get('Federation_old');
    const MultiSigWallet = await deployments.get('MultiSigWallet');
    const AllowTokens_old = await deployments.get('AllowTokens_old');

    const config = {
        bridge: BridgeProxy.address.toLowerCase(),
        federation: Federation_old.address.toLowerCase(),
        multiSig: multiSig ?? MultiSigWallet.address.toLowerCase(),
        allowTokens: AllowTokens_old.address.toLowerCase()
    };
    if (!network.live) {
        const MainToken = await deployments.get('MainToken');
        config.testToken = MainToken.address.toLowerCase();
        const allowTokens = new web3.eth.Contract(AllowTokens_old.abi, AllowTokens_old.address);
        const data = allowTokens.methods.addAllowedToken(MainToken.address).encodeABI();
        const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSig ?? MultiSigWallet.address);
        await multiSigContract.methods.submitTransaction(AllowTokens_old.address, 0, data).send({ from: deployer });

        // Uncomment below lines to use multiple federators
        // await multiSig.confirmTransaction(0, { from: accounts[1] });
        // await multiSig.confirmTransaction(0, { from: accounts[2] });
    }

    const host = hardhatConfig.networks[network.name]?.url
    if (host) {
        config.host = host;
    } else {
        config.host = '';
    }
    config.fromBlock = await web3.eth.getBlockNumber();
    fs.writeFileSync(`../federator/config/${network.name}.json`, JSON.stringify(config, null, 4));

};
module.exports.id = 'create_config_file_old'; // id required to prevent reexecution
module.exports.tags = ['CreateConfigFile_old', 'old'];
module.exports.dependencies = ['BridgeProxy', 'Federation_old', 'MultiSigWallet', 'AllowTokens_old'];
