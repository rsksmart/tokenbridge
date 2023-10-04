const chains = require('../hardhat/helper/chains');
const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) {
    return;
  }

  const Bridge = await deployments.get('BridgeV4');
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const sideTokenFactoryAddress = await address.getSideTokenFactoryAddress(hre);

  const bridge = new web3.eth.Contract(Bridge.abi, Bridge.address);

  const methodCall = bridge.methods.initialize(
    multiSigAddress,
    deployer,
    deployer,
    sideTokenFactoryAddress,
    'r'
  );
  try {
    await methodCall.send({ from: deployer })
  } catch (error) {
    throw error;
  }

  const constructorArguments = [
    Bridge.address,
    proxyAdminAddress,
    methodCall.encodeABI()
  ];

  const deployProxyResult = await deploy('BridgeProxy', {
    from: deployer,
    args: constructorArguments,
    log: true,
  });
  if (deployProxyResult.newlyDeployed) {
    log(`Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`);

    if(network.live && !chains.isRSK(network)) {
      log(`Startig Verification of ${deployProxyResult.address}`);
      await hre.run("verify:verify", {
        address: deployProxyResult.address,
        constructorArguments: constructorArguments,
      });
    }
  }

};
module.exports.id = 'deploy_bridge_proxy'; // id required to prevent reexecution
module.exports.tags = ['BridgeProxy', 'DeployFromScratch', 'IntegrationTest'];
module.exports.dependencies = ['BridgeV4', 'MultiSigWallet', 'ProxyAdmin', 'SideTokenFactory'];
