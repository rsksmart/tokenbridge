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
      network_id: "5777",
      gas: 6700000,
      gasPrice: 20000000000
    },
    //RSK
    rskregtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "33",
      gas: 6700000,
      gasPrice: 60000000 // 0.06 gwei
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    rsktestnet: {
      provider: () =>
        new HDWalletProvider(MNEMONIC, "http://public-node.testnet.rsk.co/1.1.0"),
      network_id: 31,
      gas: 6700000,
      gasPrice: 62000000 // 0.06 gwei
    },
     //Ethereum
     ropsten: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/" + INFURA_API_KEY),
      network_id: 3,
      gas: 4700000,
      gasPrice: 10000000000
    },
    kovan: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://kovan.infura.io/v3/" + INFURA_API_KEY),
      network_id: 42,
      gas: 7000000,
      gasPrice: 10000000000
    },
    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_API_KEY),
      network_id: 4,
      gas: 7000000,
      gasPrice: 10000000000
    },
  },
  compilers: {
      solc: {
        version: "0.5.3",
        settings: {
          optimizer: {
            enabled: false,
            // Optimize for how many times you intend to run the code.
            // Lower values will optimize more for initial deployment cost, higher
            // values will optimize more for high-frequency usage.
            runs: 200
          }
        }
      }
  }
};