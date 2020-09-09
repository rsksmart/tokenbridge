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
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require('fs');

let MNEMONIC = fs.existsSync('./mnemonic.key') ? fs.readFileSync('./mnemonic.key', { encoding: 'utf8' }) : "";// Your metamask's recovery words
const INFURA_API_KEY = fs.existsSync('./infura.key') ? fs.readFileSync('./infura.key',{ encoding: 'utf8' }) : "";// Your Infura API Key after its registration

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!met
  networks: {
    //Ganache
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 6300000,
      gasPrice: 20000000000
    },
    //RSK
    rskregtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "33",
      gas: 6300000,
      gasPrice: 60000000 // 0.06 gwei
    },
    soliditycoverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    rsktestnet: {
      provider: () =>
        new HDWalletProvider(MNEMONIC, "https://public-node.testnet.rsk.co"),
      network_id: 31,
      gas: 6300000,
      gasPrice: 60000000, // 0.06 gwei
      skipDryRun: true
    },
    rskmainnet: {
      provider: () =>
        new HDWalletProvider(MNEMONIC, "https://public-node.rsk.co"),
      network_id: 30,
      gas: 6300000,
      gasPrice: 60000000, // 0.06 gwei
      skipDryRun: true
    },
     //Ethereum
     ropsten: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/" + INFURA_API_KEY),
      network_id: 3,
      gas: 4700000,
      gasPrice: 10000000000,
      skipDryRun: true
    },
    kovan: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://kovan.infura.io/v3/" + INFURA_API_KEY),
      network_id: 42,
      gas: 6300000,
      gasPrice: 10000000000,
      skipDryRun: true
    },
    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_API_KEY),
      network_id: 4,
      gas: 6300000,
      gasPrice: 10000000000,
      skipDryRun: true
    },
    ethmainnet: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://mainnet.infura.io/v3/" + INFURA_API_KEY),
      network_id: 1,
      gas: 6700000,
      gasPrice: 250000000000,
      skipDryRun: true
    },
  },
  plugins: ["solidity-coverage"],
  mocha: {
    reporter: 'eth-gas-reporter',
    //reporterOptions : { ... } // See options below
  },
  compilers: {
      solc: {
        version: "0.5.17",
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