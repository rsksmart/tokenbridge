/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a 
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() { 
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>') 
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!met
  networks: {
    //Ganache
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    //RSK
    regtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "*" // Match any network id
    },
    testnet: {
      provider: () => new HDWalletProvider(MNEMONIC, 'https://public-node.testnet.rsk.co'),
      network_id: 31, // Match chain id
      gas: 2500000,
      gasPrice: 59240000
    },
  },
  compilers: {
      solc: {
          version: "0.5.7"
      }
  }
};