const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, bridgeProxy, proxyAdmin, multiSig} = await getNamedAccounts();
  const {log} = deployments;

  const bridgeDeployment = await deployments.get('Bridge');
  const proxyAdminArtifact = await deployments.get('ProxyAdmin');
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');

  const proxyAdminContract = new web3.eth.Contract(proxyAdminArtifact.abi, proxyAdmin);
  const methodCallUpdagradeBridgeDeployment = proxyAdminContract.methods.upgrade(bridgeProxy, bridgeDeployment.address);
  await methodCallUpdagradeBridgeDeployment.call({ from: multiSig });

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSig);
  await multiSigContract.methods.submitTransaction(
    proxyAdmin,
    0,
    methodCallUpdagradeBridgeDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade BridgeProxy contract in ProxyAdmin`);
};
module.exports.id = 'upgrade_bridge'; // id required to prevent reexecution
module.exports.tags = ['UpgradeBridge', 'Upgrade'];
module.exports.dependencies = ['Bridge'];
