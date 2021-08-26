require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-truffle5');
require('solidity-coverage');
require('hardhat-gas-reporter');
require('hardhat-deploy');
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('@thinkanddev/hardhat-erc1820-rsk');

const fs = require('fs');

const MNEMONIC = fs.existsSync('./mnemonic.key') ? fs.readFileSync('./mnemonic.key', {encoding: 'utf8'}) : ''; // Your metamask's recovery words
const INFURA_API_KEY = fs.existsSync('./infura.key') ? fs.readFileSync('./infura.key', {encoding: 'utf8'}) : ''; // Your Infura API Key after its registration

const ETHEREUM_MAIN_NET_CHAIN_ID = 1;
const RSK_MAIN_NET_CHAIN_ID = 30;
const RSK_TEST_NET_CHAIN_ID = 31;
const ETHEREUM_KOVAN_CHAIN_ID = 42;
const DEFAULT_DEPLOYER_ACCOUNT_INDEX = 0;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.7.6',
    settings: {
      evmVersion: 'istanbul',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    currency: 'RBTC',
    gasPrice: 0.06,
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    only: [
      ':AllowTokens',
      ':Bridge',
      ':Federation',
      ':IERC20$',
      ':MainToken$',
      ':ERC777$',
      ':MultiSigWallet$',
      ':ProxyAdmin$',
      ':SideToken',
      ':TransparentUpgradeableProxy$',
    ],
  },
  namedAccounts: getNamedAccounts(),
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
      tags: ['integrationTest', 'local'],
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
        mnemonic: MNEMONIC,
      },
      tags: ['staging'],
    },
    rskmainnet: {
      live: true,
      url: 'https://public-node.rsk.co',
      blockGasLimit: 6800000,
      gasPrice: 60000000, // 0.06 gwei
      chainId: 30,
      hardfork: 'istanbul', // London hardfork is incompatible with RSK gasPrice
      accounts: {
        mnemonic: MNEMONIC,
      },
      tags: ['prod'],
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
        mnemonic: MNEMONIC,
      },
      tags: ['staging'],
    },
    ethmainnet: {
      live: true,
      url: 'wss://mainnet.infura.io/ws/v3/' + INFURA_API_KEY,
      network_id: 1,
      gas: 6700000,
      gasPrice: 250000000000,
      websockets: true,
      accounts: {
        mnemonic: MNEMONIC,
      },
      tags: ['prod'],
    },
  },
};

function getNamedAccounts() {
  return {
    deployer: {
      default: DEFAULT_DEPLOYER_ACCOUNT_INDEX,
    },
    multiSig: getMultiSigAddressesByChainId(),
    wrappedCurrency: getWrappedCurrencyAddressesByChainId(),
    proxyAdmin: getProxyAdminAddressesByChainId(),
    allowTokensProxy: getAllowTokensProxyAddressesByChainId(),
    bridgeProxy: getBridgeProxyAddressesByChainId(),
    federatorProxy: getFederatorProxyAddressesByChainId(),
  };
}

function getMultiSigAddressesByChainId() {
  let multiSigAddressesByChainId = {};
  multiSigAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0x040007b1804ad78a97f541bebed377dcb60e4138';
  multiSigAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0x040007b1804ad78a97f541bebed377dcb60e4138';
  multiSigAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0x88f6b2bc66f4c31a3669b9b1359524abf79cfc4a';
  multiSigAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0x040007b1804ad78a97f541bebed377dcb60e4138';
  return multiSigAddressesByChainId;
}

function getWrappedCurrencyAddressesByChainId() {
  let wrappedCurrencyAddressesByChainId = {};
  wrappedCurrencyAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  wrappedCurrencyAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0x967f8799af07df1534d48a95a5c9febe92c53ae0';
  wrappedCurrencyAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0x09b6ca5e4496238a1f176aea6bb607db96c2286e';
  wrappedCurrencyAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0xd0A1E359811322d97991E03f863a0C30C2cF029C';
  return wrappedCurrencyAddressesByChainId;
}

function getProxyAdminAddressesByChainId() {
  let proxyAdminAddressesByChainId = {};
  proxyAdminAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0xe4d351911a6d599f91a3db1843e2ecb0f851e7e6';
  proxyAdminAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0x12ed69359919fc775bc2674860e8fe2d2b6a7b5d';
  proxyAdminAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0x8c35e166d2dea7a8a28aaea11ad7933cdae4b0ab';
  proxyAdminAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0xe4d351911a6d599f91a3db1843e2ecb0f851e7e6';
  return proxyAdminAddressesByChainId;
}

function getAllowTokensProxyAddressesByChainId() {
  let allowTokensProxyAddressesByChainId = {};
  allowTokensProxyAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0xa3fc98e0a7a979677bc14d541be770b2cb0a15f3';
  allowTokensProxyAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0xcb789036894a83a008a2aa5b3c2dde41d0605a9a';
  allowTokensProxyAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0xc65bf0ae75dc1a5fc9e6f4215125692a548c773a';
  allowTokensProxyAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0x92bf86334583909b60f9b798a9dd7debd899fec4';
  return allowTokensProxyAddressesByChainId;
}

function getBridgeProxyAddressesByChainId() {
  let bridgeProxyAddressesByChainId = {};
  bridgeProxyAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0x12ed69359919fc775bc2674860e8fe2d2b6a7b5d';
  bridgeProxyAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0x9d11937e2179dc5270aa86a3f8143232d6da0e69';
  bridgeProxyAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0x684a8a976635fb7ad74a0134ace990a6a0fcce84';
  bridgeProxyAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0x12ed69359919fc775bc2674860e8fe2d2b6a7b5d';
  return bridgeProxyAddressesByChainId;
}

function getFederatorProxyAddressesByChainId() {
  let federatorProxyAddressesByChainId = {};
  federatorProxyAddressesByChainId[ETHEREUM_MAIN_NET_CHAIN_ID] = '0x5e29c223d99648c88610519f96e85e627b3abe17';
  federatorProxyAddressesByChainId[RSK_MAIN_NET_CHAIN_ID] = '0x7ecfda6072942577d36f939ad528b366b020004b';
  federatorProxyAddressesByChainId[RSK_TEST_NET_CHAIN_ID] = '0x5d663981d930e8ec108280b9d80885658148ab0f';
  federatorProxyAddressesByChainId[ETHEREUM_KOVAN_CHAIN_ID] = '0xa347438bc288f56cb6083a79133e70dd2d1f6c2d';
  return federatorProxyAddressesByChainId;
}
