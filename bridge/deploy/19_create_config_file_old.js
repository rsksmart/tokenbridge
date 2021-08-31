const hardhatConfig = require('../hardhat.config');
const fs = require('fs');

module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
    const {deployer, multiSig} = await getNamedAccounts()

    if (network.name === 'soliditycoverage' || network.name === 'hardhat') {
        return;
    }
    const BridgeProxy = await deployments.get('BridgeProxy');
    const FederationV1 = await deployments.get('FederationV1');
    const MultiSigWallet = await deployments.get('MultiSigWallet');
    const AllowTokensV1 = await deployments.get('AllowTokensV1');

    const config = {
        bridge: BridgeProxy.address.toLowerCase(),
        federation: FederationV1.address.toLowerCase(),
        multiSig: multiSig ?? MultiSigWallet.address.toLowerCase(),
        allowTokens: AllowTokensV1.address.toLowerCase()
    };
    if (!network.live) {
        const MainToken = await deployments.get('MainToken');
        config.testToken = MainToken.address.toLowerCase();
        const allowTokens = new web3.eth.Contract(AllowTokensV1.abi, AllowTokensV1.address);
        const data = allowTokens.methods.addAllowedToken(MainToken.address).encodeABI();
        const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, multiSig ?? MultiSigWallet.address);
        await multiSigContract.methods.submitTransaction(AllowTokensV1.address, 0, data).send({ from: deployer });

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
module.exports.dependencies = ['BridgeProxy', 'FederationV1', 'MultiSigWallet', 'AllowTokensV1'];
