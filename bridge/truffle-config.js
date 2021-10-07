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

const MNEMONIC = fs.existsSync('./mnemonic.key')
  ? fs.readFileSync('./mnemonic.key', { encoding: 'utf8' })
  : "";// Your metamask's recovery words
const INFURA_API_KEY = fs.existsSync('./infura.key')
  ? fs.readFileSync('./infura.key',{ encoding: 'utf8' })
  : "";// Your Infura API Key after its registration
const ETHERSCAN_API_KEY = fs.existsSync('./etherscan.key')
  ? fs.readFileSync('./etherscan.key',{ encoding: 'utf8' })
  : "";// Your Etherscan API Key after its registration

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
    mirrorDevelopment: {
      host: "127.0.0.1",
      port: 8546,
      network_id: "5776",
      gas: 6700000,
      gasPrice: 20000000000
    },
    //RSK
    rskregtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "33",
      gas: 6800000,
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
        new HDWalletProvider(MNEMONIC, "https://public-node.testnet.rsk.co"), //Use private node as public one will give a timeout error 
      network_id: 31,
      gas: 6800000,
      gasPrice: 70000000, // 0.07 gwei
      skipDryRun: true,
      // // Higher polling interval to check for blocks less frequently
      pollingInterval: 15e3,
      deploymentPollingInterval: 15e3,
      networkCheckTimeout: 1e6,
      timeoutBlocks: 200,
    },
    rskmainnet: {
      provider: () =>
        new HDWalletProvider(MNEMONIC, "https://public-node.rsk.co"),
      network_id: 30,
      gas: 6800000,
      gasPrice: 65000000, // 0.065 gwei
      skipDryRun: true,
      // Higher polling interval to check for blocks less frequently
      pollingInterval: 15e3,
      deploymentPollingInterval: 15e3,
      networkCheckTimeout: 1e6,
      timeoutBlocks: 200,
    },
     //Ethereum
     ropsten: {
      provider: () => new HDWalletProvider(MNEMONIC, "wss://ropsten.infura.io/ws/v3/" + INFURA_API_KEY),
      network_id: 3,
      gas: 4700000,
      gasPrice: 10000000000,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
      websockets: true,
    },
    kovan: {
      provider: () => new HDWalletProvider(MNEMONIC, "wss://kovan.infura.io/ws/v3/" + INFURA_API_KEY),
      network_id: 42,
      gas: 6700000,
      gasPrice: 10000000000,
      skipDryRun: true,
      pollingInterval: 15e3,
      deploymentPollingInterval: 15e3,
      networkCheckTimeout: 1e6,
      timeoutBlocks: 200,
      websockets: true,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC, "wss://rinkeby.infura.io/ws/v3/" + INFURA_API_KEY),
      network_id: 4,
      gas: 6700000,
      gasPrice: 10000000000,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
      websockets: true,
    },
    ethmainnet: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ethereum.squidswap.cash"),
      network_id: 1,
      gas: 4700000,
      gasPrice: 60000000000,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
    },
    bchmainnet: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://smartbch.squidswap.cash"),
      network_id: 10001,
      gas: 6800000,
      gasPrice: 1050000000,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
    },
    bscmainnet: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://bsc-dataseed.binance.org"),
      network_id: 56,
      gas: 6800000,
      gasPrice: 5000000000,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
    },
  },
  plugins: ['solidity-coverage', 'truffle-plugin-verify'], //truffle-plugin-blockscout-verify
  mocha: {
    reporter: 'eth-gas-reporter',
    //reporterOptions : { ... } // See options below
  },
  compilers: {
      solc: {
        version: "0.7.6",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            // Optimize for how many times you intend to run the code.
            // Lower values will optimize more for initial deployment cost, higher
            // values will optimize more for high-frequency usage.
            runs: 1000000
          }
        }
      }
  },
  api_keys: {
    etherscan: ETHERSCAN_API_KEY
  }
};
