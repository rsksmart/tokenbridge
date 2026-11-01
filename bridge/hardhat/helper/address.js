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
  if (bridgeProxy) {
    return bridgeProxy
  }
  const bridgeProxyDeployment = await deployments.getOrNull('BridgeProxy')
  if (bridgeProxyDeployment) {
    return bridgeProxyDeployment.address;
  }
  return bridgeProxyDeployment;
}

async function getFederationProxyAddress(hre) {
  const {deployments} = hre;
  const {federationProxy} = await getNamedAccountsInstance(hre);

  if (federationProxy) {
    return federationProxy;
  }
  const federationProxyDeployment = await deployments.getOrNull('FederationProxy')
  if (federationProxyDeployment) {
    return federationProxyDeployment.address;
  }
  return federationProxyDeployment;
}

async function getAllowTokensProxyAddress(hre) {
  const {deployments} = hre;
  const {allowTokensProxy} = await getNamedAccountsInstance(hre);

  if (allowTokensProxy) {
    return allowTokensProxy;
  }
  const allowTokensProxyDeployment = await deployments.getOrNull('AllowTokensProxy')
  if (allowTokensProxyDeployment) {
    return allowTokensProxyDeployment.address;
  }
  return allowTokensProxyDeployment;
}

async function getSideTokenFactoryAddress(hre) {
  const {deployments} = hre;
  const {sideTokenFactory} = await getNamedAccountsInstance(hre);
  return sideTokenFactory ?? (await deployments.get('SideTokenFactoryV1')).address;
}

module.exports = {
  getProxyAdminAddress: getProxyAdminAddress,
  getMultiSigAddress: getMultiSigAddress,
  getBridgeProxyAddress: getBridgeProxyAddress,
  getFederationProxyAddress: getFederationProxyAddress,
  getAllowTokensProxyAddress: getAllowTokensProxyAddress,
  getSideTokenFactoryAddress: getSideTokenFactoryAddress,
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
  NULL_HASH:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
};
