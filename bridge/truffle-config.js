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
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

//resulting address 0x170346689cC312D8E19959Bc68c3AD03E72C9850
const MNEMONIC = fs.readFileSync('./mnemonic.key', { encoding: 'utf8' });// Your metamask's recovery words
const INFURA_API_KEY = fs.readFileSync('./infura.key',{ encoding: 'utf8' });// Your Infura API Key after its registration

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!met
  networks: {
    //Ganache
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6721975
    },
    //RSK
    regtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "*", // Match any network id
      gas: 6800000
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
          version: "0.5.7"
      }
  }
};