const Federation = artifacts.require("Federation");
const FederationProxy = artifacts.require("FederationProxy");
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
    const deployedJson = deployHelper.getDeployed(networkName);
    await deployer.deploy(Federation);
    // Replace with below line to use multiple federators
    // return deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
    const federationLogic = await Federation.deployed();
    deployedJson.Federation = federationLogic.address.toLowerCase();
    deployHelper.saveDeployed(deployedJson);

    let federationsMembers = [accounts[0]];
    let required = 1;
    if(networkName.toLowerCase().includes('testnet') || networkName.toLowerCase().includes('kovan')) {
        federationsMembers = ['0x8f397ff074ff190fc650e5cab4da039a8163e12a'];
    }
    if(networkName.toLowerCase().includes('mainnet')) {
        federationsMembers = [
            '0x5eb6ceca6bdd82f4a38aac0b957e6a4b5b1cceba',
            '0x8a9ec366c1b359fed1a7372cf8607ec52963b550',
            '0xa4398c6ff62e9b93b32b28dd29bd27c6b106245f',
            '0x1089a708b03821b19db9bdf179fbd7ed7ce591d7',
            '0x04237d65eb6cdc9f93db42fef53f7d5aaca2f1d6',
        ];
        required = 2;
    }

    const initData = federationLogic.contract.methods.initialize(
        federationsMembers,
        required,
        deployedJson.BridgeProxy,
        deployedJson.MultiSig
    ).encodeABI();
    await deployer.deploy(FederationProxy, federationLogic.address, deployedJson.ProxyAdmin, initData);

    const federationProxy = await FederationProxy.deployed();
    deployedJson.FederationProxy = federationProxy.address.toLowerCase();
    await Federation.at(federationProxy.address);
    deployHelper.saveDeployed(deployedJson);
};