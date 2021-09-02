module.exports = async function ({getNamedAccounts, deployments, network}) { // HardhatRuntimeEnvironment
  const {deployer, multiSig, proxyAdmin, bridgeProxy, sideTokenFactory} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (bridgeProxy) return;

  let symbol = 'e';
  if(network.name == 'rskregtest' || network.name == 'rsktestnet' || network.name == 'rskmainnet')
    symbol = 'r'

  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const ProxyAdmin = await deployments.get('ProxyAdmin');
  const Bridge = await deployments.get('Bridge');
  const SideTokenFactory = await deployments.get('SideTokenFactory');

  const bridge = new web3.eth.Contract(Bridge.abi, Bridge.address);
  const methodCall = bridge.methods.initialize(
    multiSig ?? MultiSigWallet.address,
    deployer,
    deployer,
    sideTokenFactory ?? SideTokenFactory.address,
    symbol
  );
  await methodCall.call({ from: deployer })

  const deployProxyResult = await deploy('BridgeProxy', {
    from: deployer,
    args: [
      Bridge.address,
      proxyAdmin ?? ProxyAdmin.address,
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
module.exports.dependencies = ['Bridge', 'MultiSigWallet', 'ProxyAdmin', 'SideTokenFactory'];
