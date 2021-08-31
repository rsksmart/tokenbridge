module.exports = async function({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin, bridgeProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (!bridgeProxy) {
    let symbol = 'e';
    if (network.name === 'rskregtest' || network.name === 'rsktestnet' || network.name === 'rskmainnet') {
      symbol = 'r';
    }

    const MultiSigWallet = await deployments.get('MultiSigWallet');
    const ProxyAdmin = await deployments.get('ProxyAdmin');
    const FederationV1 = await deployments.get('FederationV1');
    const AllowTokensV1 = await deployments.get('AllowTokensV1');
    const SideTokenFactoryV1 = await deployments.get('SideTokenFactoryV1');

    const BridgeV2 = await deployments.get('BridgeV2');
    const bridge = new web3.eth.Contract(BridgeV2.abi, BridgeV2.address);
    const methodCall = bridge.methods.initialize(
      multiSig ?? MultiSigWallet.address,
      FederationV1.address,
      AllowTokensV1.address,
      SideTokenFactoryV1.address,
      symbol
    );
    await methodCall.call({from: deployer});

    const deployProxyResult = await deploy('BridgeProxy', {
      from: deployer,
      args: [BridgeV2.address, proxyAdmin ?? ProxyAdmin.address, methodCall.encodeABI()],
      log: true
    });
    if (deployProxyResult.newlyDeployed) {
      log(`Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`);
    }
  }
};
module.exports.id = 'deploy_bridgeProxy'; // id required to prevent reexecution
module.exports.tags = ['BridgeProxy', 'old'];
module.exports.dependencies = ['BridgeV2', 'MultiSigWallet', 'ProxyAdmin', 'FederationV1', 'AllowTokensV1', 'SideTokenFactoryV1'];
