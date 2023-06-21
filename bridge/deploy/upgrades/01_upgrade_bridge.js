const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, bridgeProxy, proxyAdmin, multiSig} = await getNamedAccounts();
  const {log} = deployments;

  const bridgeDeployed = await deployments.get('BridgeV3');
  const proxyAdminArtifact = await deployments.getArtifact('ProxyAdmin');
  const multiSigWalletArtifact = await deployments.getArtifact('MultiSigWallet');

  const proxyAdminContract = new web3.eth.Contract(proxyAdminArtifact.abi, proxyAdmin);
  const methodCallUpdagradeBridgeDeployment = proxyAdminContract.methods.upgrade(bridgeProxy, bridgeDeployed.address);
  await methodCallUpdagradeBridgeDeployment.call({ from: multiSig });

  const multiSigContract = new web3.eth.Contract(multiSigWalletArtifact.abi, multiSig);
  await multiSigContract.methods.submitTransaction(
    proxyAdmin,
    0,
    methodCallUpdagradeBridgeDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade BridgeProxy contract in ProxyAdmin`);
};
module.exports.id = 'upgrade_bridge'; // id required to prevent reexecution
module.exports.tags = ['UpgradeBridge', 'Upgrade'];
module.exports.dependencies = ['BridgeV3'];
