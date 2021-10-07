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
