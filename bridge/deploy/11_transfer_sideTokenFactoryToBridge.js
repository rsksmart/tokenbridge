module.exports = async function ({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, sideTokenFactory} = await getNamedAccounts();
  const {log, execute} = deployments;

  if (sideTokenFactory) return

  const BridgeProxy = await deployments.get('BridgeProxy');
  await execute('SideTokenFactory', {from: deployer}, 'transferPrimary', BridgeProxy.address);
  log(`SideTokenFactory Transfered Primary to BridgeProxy`);
};
module.exports.id = 'transfer_side_token_factory_to_bridge';
module.exports.tags = ['SideTokenFactoryToBridge', 'new'];
module.exports.dependencies = ['BridgeProxy', 'SideTokenFactory'];
