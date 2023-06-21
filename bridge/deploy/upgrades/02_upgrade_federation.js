const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, federationProxy, proxyAdmin, multiSig} = await getNamedAccounts();
  const {log} = deployments;

  const federationDeployed = await deployments.get('FederationV2');
  const proxyAdminArtifact = await deployments.getArtifact('ProxyAdmin');
  const multiSigWalletDeployment = await deployments.getArtifact('MultiSigWallet');

  const proxyAdminContract = new web3.eth.Contract(proxyAdminArtifact.abi, proxyAdmin);
  const methodCallUpdagradeBridgeDeployment = proxyAdminContract.methods.upgrade(federationProxy, federationDeployed.address);
  await methodCallUpdagradeBridgeDeployment.call({ from: multiSig });

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSig);
  await multiSigContract.methods.submitTransaction(
    proxyAdmin,
    0,
    methodCallUpdagradeBridgeDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade FederationProxy contract in ProxyAdmin`);
};
module.exports.id = 'upgrade_federation'; // id required to prevent reexecution
module.exports.tags = ['UpgradeFederation', 'Upgrade'];
module.exports.dependencies = ['FederationV2'];
