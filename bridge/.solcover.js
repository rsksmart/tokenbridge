module.exports = {
  skipFiles: [
    'test',
    'zeppelin',
    'Utils/UtilsV1.sol',
    'Bridge/BridgeV2.sol',
    'SideToken/SideTokenV1.sol',
    'Federation/FederationV1.sol',
    'Federation/FederationV2.sol',
    'AllowTokens/AllowTokensV0.sol',
    'SideTokenFactory/SideTokenFactoryV1.sol',
  ],
  providerOptions: {
    network_id: 5888,
    //vmErrorsOnRPCResponse: false
  }
};