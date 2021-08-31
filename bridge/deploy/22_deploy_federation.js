module.exports = async function({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin, bridgeProxy, federatorProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  const deployResult = await deploy('FederationV2', {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(
      `Contract Federation deployedV2 at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
    );
  }

  const FederationV2 = await deployments.get('FederationV2');
  let proxyAdminAddress = proxyAdmin ?? (await deployments.get('ProxyAdmin')).address;
  const multiSigAddress = multiSig ?? (await deployments.get('MultiSigWallet')).address;
  const bridgeProxyAddress = bridgeProxy ?? (await deployments.get('BridgeProxy')).address

  let federationsMembers = [deployer];
  let required = 1;
  if (network.name.toLowerCase().includes('testnet') || network.name.toLowerCase().includes('kovan')) {
    federationsMembers = ['0x8f397ff074ff190fc650e5cab4da039a8163e12a'];
  }
  if (network.name.toLowerCase().includes('mainnet')) {
    federationsMembers = [
      '0x5eb6ceca6bdd82f4a38aac0b957e6a4b5b1cceba',
      '0x8a9ec366c1b359fed1a7372cf8607ec52963b550',
      '0xa4398c6ff62e9b93b32b28dd29bd27c6b106245f',
      '0x1089a708b03821b19db9bdf179fbd7ed7ce591d7',
      '0x04237d65eb6cdc9f93db42fef53f7d5aaca2f1d6'
    ];
    required = 2;
  }
  const federationLogic = new web3.eth.Contract(FederationV2.abi, FederationV2.address);
  const methodCall = federationLogic.methods.initialize(
    federationsMembers,
    required,
    bridgeProxyAddress,
    multiSigAddress
  );
  methodCall.call({from: deployer});

  if (!federatorProxy) {
    const deployProxyResult = await deploy('FederationProxy', {
      from: deployer,
      args: [
        FederationV2.address,
        proxyAdminAddress,
        methodCall.encodeABI()
      ],
      log: true
    });
    if (deployProxyResult.newlyDeployed) {
      log(
        `Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`
      );
    }
  }
};
module.exports.id = 'deploy_federation_v2'; // id required to prevent reexecution
module.exports.tags = ['FederationV2', 'new'];
module.exports.dependencies = ['MultiSigWallet', 'ProxyAdmin'];
