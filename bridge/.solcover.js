module.exports = {
  skipFiles: [
    'test',
    'zeppelin',
    'Federation/FederationV1.sol',
    'SideTokenFactory/SideTokenFactoryV1.sol',
    'SideToken/SideTokenV1.sol'
  ],
  providerOptions: {
    network_id: 5888,
    //vmErrorsOnRPCResponse: false
  }
};