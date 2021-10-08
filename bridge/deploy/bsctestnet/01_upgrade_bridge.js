const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  const bridgeDeployment = await deployments.get('Bridge');
  const proxyAdminDeployment = await deployments.get('ProxyAdmin');
  const bridgeProxyDeployment = await deployments.get('BridgeProxy');
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');

  const proxyAdminContract = new web3.eth.Contract(proxyAdminDeployment.abi, proxyAdminDeployment.address);
  const methodCallUpdagradeBridgeDeployment = proxyAdminContract.methods.upgrade(bridgeProxyDeployment.address, bridgeDeployment.address);
  await methodCallUpdagradeBridgeDeployment.call({ from: multiSigAddress });

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSigAddress);
  await multiSigContract.methods.submitTransaction(
    proxyAdminDeployment.address,
    0,
    methodCallUpdagradeBridgeDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade BridgeProxy contract in ProxyAdmin`);
};
module.exports.id = 'deploy_new_bridge'; // id required to prevent reexecution
module.exports.tags = ['UpgradeBridge'];
module.exports.dependencies = ['BridgeDeployment'];
