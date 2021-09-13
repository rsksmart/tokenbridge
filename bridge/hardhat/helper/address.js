let namedAccountsInstance = null;

async function getNamedAccountsInstance(hre) {
  if (namedAccountsInstance == null) {
    const {getNamedAccounts} = hre;
    namedAccountsInstance = await getNamedAccounts();
  }
  return namedAccountsInstance;
}

async function getProxyAdminAddress(hre) {
  const {deployments} = hre;
  const {proxyAdmin} = await getNamedAccountsInstance(hre);
  return proxyAdmin ?? (await deployments.get('ProxyAdmin')).address;
}

async function getMultiSigAddress(hre) {
  const {deployments} = hre;
  const {multiSig} = await getNamedAccountsInstance(hre);
  return multiSig ?? (await deployments.get('MultiSigWallet')).address;
}

async function getBridgeProxyAddress(hre) {
  const {deployments} = hre;
  const {bridgeProxy} = await getNamedAccountsInstance(hre);
  return bridgeProxy ?? (await deployments.get('BridgeProxy')).address;
}

async function getFederatorProxyAddress(hre) {
  const {deployments} = hre;
  const {federatorProxy} = await getNamedAccountsInstance(hre);
  return federatorProxy ?? (await deployments.get('FederationProxy')).address;
}

async function getAllowTokensProxyAddress(hre) {
  const {deployments} = hre;
  const {allowTokensProxy} = await getNamedAccountsInstance(hre);
  return allowTokensProxy ?? (await deployments.get('AllowTokensProxy')).address;
}

async function getSideTokenFactoryAddress(hre) {
  const {deployments} = hre;
  const {sideTokenFactory} = await getNamedAccountsInstance(hre);
  return sideTokenFactory ?? (await deployments.get('SideTokenFactory')).address;
}

module.exports = {
  getProxyAdminAddress: getProxyAdminAddress,
  getMultiSigAddress: getMultiSigAddress,
  getBridgeProxyAddress: getBridgeProxyAddress,
  getFederatorProxyAddress: getFederatorProxyAddress,
  getAllowTokensProxyAddress: getAllowTokensProxyAddress,
  getSideTokenFactoryAddress: getSideTokenFactoryAddress,
};
