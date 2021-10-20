const address = require('../hardhat/helper/address');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const {deploy, log} = deployments;
  const BRIDGE_LAST_VERSION = 'v4'

  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);
  if (bridgeProxyAddress) {
    const Bridge = await deployments.get('Bridge');
    const bridge = new web3.eth.Contract(Bridge.abi, bridgeProxyAddress);
    const currentBridgeVersion = bridge.methods.version().call();
    if (currentBridgeVersion === BRIDGE_LAST_VERSION) {
      return;
    }
  }

  const deployResult = await deploy('Bridge', {
    from: deployer,
    log: true,
  });

  if (deployResult.newlyDeployed) {
    log(`Contract Bridge deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_bridge'; // id required to prevent reexecution
module.exports.tags = ['Bridge', 'new', 'BridgeDeployment', 'IntegrationTest'];
