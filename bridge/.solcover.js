module.exports = {
  skipFiles: [
    'test',
    'zeppelin',
    'Bridge/BridgeV3.sol',
    'Bridge/IBridgeV3.sol',
    'SideToken/SideTokenV1.sol',
    'Federation/FederationV2.sol',
    'AllowTokensV1.sol/AllowTokensV0.sol.sol',
    'SideTokenFactory/SideTokenFactoryV1.sol',
  ],
  providerOptions: {
    network_id: 5888,
    //vmErrorsOnRPCResponse: false
  }
};
