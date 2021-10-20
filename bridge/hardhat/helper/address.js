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

async function getNftBridgeProxyAddress(hre) {
  const {deployments} = hre;
  const {nftBridgeProxy} = await getNamedAccountsInstance(hre);

  if (nftBridgeProxy) {
    return nftBridgeProxy
  }
  const nftBridgeProxyDeployment = await deployments.getOrNull('NftBridgeProxy')
  if (nftBridgeProxyDeployment) {
    return nftBridgeProxyDeployment.address;
  }
  return nftBridgeProxyDeployment;
}

async function getFederatorProxyAddress(hre) {
  const {deployments} = hre;
  const {federatorProxy} = await getNamedAccountsInstance(hre);

  if (federatorProxy) {
    return federatorProxy;
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
  return sideTokenFactory ?? (await deployments.get('SideTokenFactory')).address;
}

module.exports = {
  getProxyAdminAddress: getProxyAdminAddress,
  getMultiSigAddress: getMultiSigAddress,
  getBridgeProxyAddress: getBridgeProxyAddress,
  getNftBridgeProxyAddress: getNftBridgeProxyAddress,
  getFederatorProxyAddress: getFederatorProxyAddress,
  getAllowTokensProxyAddress: getAllowTokensProxyAddress,
  getSideTokenFactoryAddress: getSideTokenFactoryAddress,
};
