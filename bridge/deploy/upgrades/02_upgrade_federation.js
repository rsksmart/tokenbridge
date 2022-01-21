const address = require('../../hardhat/helper/address');

module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, federationProxy, proxyAdmin, multiSig} = await getNamedAccounts();
  const {log} = deployments;

  const federationDeployment = await deployments.get('Federation');
  const proxyAdminDeployment = await deployments.get('ProxyAdmin');
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');

  const proxyAdminContract = new web3.eth.Contract(proxyAdminDeployment.abi, proxyAdmin);
  const methodCallUpdagradeBridgeDeployment = proxyAdminContract.methods.upgrade(federationProxy, federationDeployment.address);
  await methodCallUpdagradeBridgeDeployment.call({ from: multiSig });

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSig);
  await multiSigContract.methods.submitTransaction(
    proxyAdminDeployment.address,
    0,
    methodCallUpdagradeBridgeDeployment.encodeABI(),
  ).send({ from: deployer });
  log(`MultiSig submitTransaction upgrade FederationProxy contract in ProxyAdmin`);
};
module.exports.id = 'upgrade_federation'; // id required to prevent reexecution
module.exports.tags = ['UpgradeFederation', 'Upgrade'];
module.exports.dependencies = ['Federation'];
