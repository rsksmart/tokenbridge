module.exports = {
    skipFiles: ['Migrations.sol','test','zeppelin', 'Bridge_v0.sol', 'Federation_v0.sol', 'SideToken_v0.sol', 'SideTokenFactory_v0.sol'],
    providerOptions: {
      network_id: 5888,
      //vmErrorsOnRPCResponse: false
    }
  };