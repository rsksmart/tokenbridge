require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-truffle5");
require('solidity-coverage');
require('hardhat-gas-reporter');
require('hardhat-deploy');
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require("@thinkanddev/hardhat-erc1820-rsk");

const fs = require('fs');

const MNEMONIC = fs.existsSync('./mnemonic.key')
  ? fs.readFileSync('./mnemonic.key', { encoding: 'utf8' })
  : "";// Your metamask's recovery words
const INFURA_API_KEY = fs.existsSync('./infura.key')
  ? fs.readFileSync('./infura.key',{ encoding: 'utf8' })
  : "";// Your Infura API Key after its registration

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      evmVersion: 'istanbul',
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    currency: 'RBTC',
    gasPrice: 0.06
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    only: [':AllowTokens', ':Bridge', ':Federation', ':IERC20$',
      ':MainToken$',':ERC777$', ':MultiSigWallet$', ':ProxyAdmin$', ':SideToken',
      ':TransparentUpgradeableProxy$'
    ]
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    multiSig: {
      1: '0x040007b1804ad78a97f541bebed377dcb60e4138',
      30: '0x040007b1804ad78a97f541bebed377dcb60e4138',
      31: '0x88f6b2bc66f4c31a3669b9b1359524abf79cfc4a',
      42: '0x040007b1804ad78a97f541bebed377dcb60e4138',
    },
    wrappedCurrency: {
      1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      30: '0x967f8799af07df1534d48a95a5c9febe92c53ae0',
      31: '0x09b6ca5e4496238a1f176aea6bb607db96c2286e',
      42: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
    },
    proxyAdmin: {
      1: '0xe4d351911a6d599f91a3db1843e2ecb0f851e7e6',
      30: '0x12ed69359919fc775bc2674860e8fe2d2b6a7b5d',
      31: '0x8c35e166d2dea7a8a28aaea11ad7933cdae4b0ab',
      42: '0xe4d351911a6d599f91a3db1843e2ecb0f851e7e6',
    }
  },
  networks: {
    hardhat: {
      live: false,
      blockGasLimit: 6800000,
      gasPrice: 60000000,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      tags: ['test', 'local'],
    },
    //Ganache
    development: {
      live: false,
      url: 'http://127.0.0.1:8545',
      network_id: '5777',
      gas: 6700000,
      gasPrice: 20000000000,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      tags: ['integrationTest', 'local'],
      saveDeployments: false,
    },
    mirrorDevelopment: {
      live: false,
      url: 'http://127.0.0.1:8546',
      network_id: '5776',
      gas: 6700000,
      gasPrice: 20000000000,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      tags: ['integrationTest','local'],
      saveDeployments: false,
    },
    // RSK
    rsktestnet: {
      live: true,
      url: 'https://public-node.testnet.rsk.co',
      blockGasLimit: 6800000,
      gasPrice: 60000000, // 0.06 gwei
      chainId: 31,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      accounts: {
        mnemonic: MNEMONIC
      },
      tags: ['staging']
    },
    rskmainnet: {
      live: true,
      url: 'https://public-node.rsk.co',
      blockGasLimit: 6800000,
      gasPrice: 60000000, // 0.06 gwei
      chainId: 30,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      accounts: {
        mnemonic: MNEMONIC
      },
      tags: ['prod']
    },
    //Ethereum
    kovan: {
      live: true,
      url: 'wss://kovan.infura.io/ws/v3/' + INFURA_API_KEY,
      network_id: 42,
      gas: 6700000,
      gasPrice: 10000000000,
      websockets: true,
      accounts: {
        mnemonic: MNEMONIC
      },
      tags: ['staging']
    },
    ethmainnet: {
      live: true,
      url: 'wss://mainnet.infura.io/ws/v3/' + INFURA_API_KEY,
      network_id: 1,
      gas: 6700000,
      gasPrice: 250000000000,
      websockets: true,
      accounts: {
        mnemonic: MNEMONIC
      },
      tags: ['prod']
    },

  },
};

