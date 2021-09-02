module.exports = {
  skipFiles: [
    'test',
    'zeppelin',
    'previous',
    'contracts/Federation/FederationV1.sol',
    'contracts/SideToken/SideTokenFactoryV1.sol',
    'contracts/SideToken/SideTokenV1.sol'
  ],
  providerOptions: {
    network_id: 5888,
    //vmErrorsOnRPCResponse: false
  }
};