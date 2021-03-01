const SideTokenFactory = artifacts.require('SideTokenFactory_old');

module.exports = async (deployer, networkName, accounts) => {
    await deployer.deploy(SideTokenFactory);
}