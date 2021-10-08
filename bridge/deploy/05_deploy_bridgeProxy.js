const chains = require('../hardhat/helper/chains');
const address = require('../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) {
    return;
  }

  const prefixSymbol = chains.tokenSymbol(network);
  const BridgeV3 = await deployments.get('BridgeV3');
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const sideTokenFactoryAddress = await address.getSideTokenFactoryAddress(hre);

  const bridgeV3 = new web3.eth.Contract(BridgeV3.abi, BridgeV3.address);
  const methodCall = bridgeV3.methods.initialize(
    multiSigAddress,
    deployer,
    deployer,
    sideTokenFactoryAddress,
    prefixSymbol
  );
  await methodCall.call({ from: deployer })

  const deployProxyResult = await deploy('BridgeProxy', {
    from: deployer,
    args: [
      BridgeV3.address,
      proxyAdminAddress,
      methodCall.encodeABI()
    ],
    log: true,
  });
  if (deployProxyResult.newlyDeployed) {
    log(`Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`);
  }

};
module.exports.id = 'deploy_bridge_proxy'; // id required to prevent reexecution
module.exports.tags = ['BridgeProxy', 'old'];
module.exports.dependencies = ['BridgeV3', 'MultiSigWallet', 'ProxyAdmin', 'SideTokenFactory'];
