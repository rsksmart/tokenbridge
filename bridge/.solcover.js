module.exports = {
  skipFiles: [
    'test',
    'zeppelin',
    'Bridge/BridgeV3.sol',
    'Bridge/IBridgeV3.sol',
    'SideToken/SideTokenV1.sol',
    'Federation/FederationV2.sol',
    'AllowTokens/AllowTokensOld.sol',
    'SideTokenFactory/SideTokenFactoryV1.sol',
  ],
  providerOptions: {
    network_id: 5888,
    //vmErrorsOnRPCResponse: false
  }
};
