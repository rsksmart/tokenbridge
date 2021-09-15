const sideTokenFactoryName = 'SideTokenFactory';
const bridgeProxyName = 'BridgeProxy';
const GAS_LIMIT = 4000000;

/**
 * Transfers primary ownership of SideTokenFactory to BridgeProxy - if it fails, check if the primary transfer
 * already occurred (if you're re-running the deploy script and haven't added the side token factory address to
 * the hardhat.config.js, this can happen).
 * @param getNamedAccounts
 * @param deployments
 * @returns {Promise<void>}
 */
module.exports = async function({getNamedAccounts, deployments}) { // HardhatRuntimeEnvironment
  const {deployer, sideTokenFactory} = await getNamedAccounts();
  const {log, execute} = deployments;
  if (sideTokenFactory) {
    return;
  }
  const BridgeProxy = await deployments.get(bridgeProxyName);
  await execute(sideTokenFactoryName, {from: deployer, gasLimit: GAS_LIMIT}, 'transferPrimary', BridgeProxy.address);
  log(`SideTokenFactory Transferred Primary to BridgeProxy`);
};
module.exports.id = 'transfer_side_token_factory_to_bridge';
module.exports.tags = ['SideTokenFactoryToBridge', 'new'];
module.exports.dependencies = [bridgeProxyName, sideTokenFactoryName];
