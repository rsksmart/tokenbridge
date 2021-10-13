const address = require('../hardhat/helper/address');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, federatorProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (federatorProxy) return;

  const FederationV2 = await deployments.get('FederationV2');
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const multiSigAddress = await address.getMultiSigAddress(hre);
  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);
  const federationConf = getFederationConf(deployer, network);

  const federationLogic = new web3.eth.Contract(FederationV2.abi, FederationV2.address);
  const methodCall = federationLogic.methods.initialize(
    federationConf.members,
    federationConf.required,
    bridgeProxyAddress,
    multiSigAddress
  );
  methodCall.call({from: deployer});

  const deployProxyResult = await deploy('FederationProxy', {
    from: deployer,
    contract: 'TransparentUpgradeableProxy',
    args: [
      FederationV2.address,
      proxyAdminAddress,
      methodCall.encodeABI()
    ],
    log: true
  });
  if (deployProxyResult.newlyDeployed) {
    log(`Contract FederationProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_federation_proxy'; // id required to prevent reexecution
module.exports.tags = ['FederationProxy', 'new', 'IntegrationTest'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin', 'FederationV2', 'BridgeProxy'];

function getFederationConf(deployer, network) {
  const networkName = network.name.toLowerCase();
  if (networkName.includes('testnet') || networkName.includes('kovan')) {
    return {
      members: ['0x8f397ff074ff190fc650e5cab4da039a8163e12a'],
      required: 1,
    };
  }

  if (networkName.includes('mainnet')) {
    return {
      members: [
        '0x5eb6ceca6bdd82f4a38aac0b957e6a4b5b1cceba',
        '0x8a9ec366c1b359fed1a7372cf8607ec52963b550',
        '0xa4398c6ff62e9b93b32b28dd29bd27c6b106245f',
        '0x1089a708b03821b19db9bdf179fbd7ed7ce591d7',
        '0x04237d65eb6cdc9f93db42fef53f7d5aaca2f1d6'
      ],
      required: 2,
    };
  }

  return {
    members: [deployer],
    required: 1,
  };
}