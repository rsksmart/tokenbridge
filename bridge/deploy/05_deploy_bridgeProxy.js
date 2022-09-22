const chains = require('../hardhat/helper/chains');
const address = require('../hardhat/helper/address');
const {web3} = require("hardhat");

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) {
    return;
  }

  const Bridge = await deployments.get('Bridge');
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const sideTokenFactoryAddress = await address.getSideTokenFactoryAddress(hre);

  const bridge = new web3.eth.Contract(Bridge.abi, Bridge.address);
  const methodCall = bridge.methods.initialize(
    multiSigAddress,
    deployer,
    deployer,
    sideTokenFactoryAddress
  );
  await methodCall.call({ from: deployer })

  const constructorArguments = [
    Bridge.address,
    proxyAdminAddress,
    methodCall.encodeABI()
  ];

  const deployResult = await deploy('BridgeProxy', {
    from: deployer,
    args: constructorArguments,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract BridgeProxy deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);

    if(network.live && !chains.isRSK(network)) {
      log(`Startig Verification of ${deployResult.address}`);
      await hre.run("verify:verify", {
        address: deployResult.address,
        constructorArguments: constructorArguments,
        contract: 'contracts/Proxies.sol:BridgeProxy'
      });
    }
  }

};
module.exports.id = 'deploy_bridge_proxy'; // id required to prevent reexecution
module.exports.tags = ['BridgeProxy', 'DeployFromScratch', 'IntegrationTest'];
module.exports.dependencies = ['Bridge', 'MultiSigWallet', 'ProxyAdmin', 'SideTokenFactory'];
