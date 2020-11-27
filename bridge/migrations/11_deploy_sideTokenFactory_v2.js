const SideTokenFactory = artifacts.require('SideTokenFactory_v2');

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(SideTokenFactory);
}