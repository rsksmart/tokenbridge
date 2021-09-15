const ETHEREUM_MAIN_NET_CHAIN_ID = 1;
const RSK_MAIN_NET_CHAIN_ID = 30;
const RSK_TEST_NET_CHAIN_ID = 31;
const KOVAN_TEST_NET_CHAIN_ID = 42;
const RINKEBY_TEST_NET_CHAIN_ID = 4;
const BSC_MAIN_NET_CHAIN_ID = 56;
const BSC_TEST_NET_CHAIN_ID = 97;
const GANACHE_DEV_MIRROR_CHAIN_ID = 5776;
const GANACHE_DEV_NET_CHAIN_ID = 5777;
const HARDHAT_TEST_NET_CHAIN_ID = 1999;

/** Network example
  config: {
    accounts: 'remote',
    live: false,
    network_id: 5777,
  },
  saveDeployments: false,
  tags: (2) ['integrationTest', 'local'],
  live: false,
  name: 'development'
*/
function isRSK(network) {
  const chainID = network.config.network_id;
  return [RSK_MAIN_NET_CHAIN_ID, RSK_TEST_NET_CHAIN_ID].includes(chainID);
}

function tokenSymbol(network) {
  return network.config.token_symbol ?? 'e';
}

function isMainnet(network) {
  const chainID = network.config.network_id;
  return [ETHEREUM_MAIN_NET_CHAIN_ID, RSK_MAIN_NET_CHAIN_ID, BSC_MAIN_NET_CHAIN_ID].includes(chainID);
}

module.exports = {
  ETHEREUM_MAIN_NET_CHAIN_ID: ETHEREUM_MAIN_NET_CHAIN_ID,
  RSK_MAIN_NET_CHAIN_ID: RSK_MAIN_NET_CHAIN_ID,
  RSK_TEST_NET_CHAIN_ID: RSK_TEST_NET_CHAIN_ID,
  KOVAN_TEST_NET_CHAIN_ID: KOVAN_TEST_NET_CHAIN_ID,
  RINKEBY_TEST_NET_CHAIN_ID: RINKEBY_TEST_NET_CHAIN_ID,
  BSC_MAIN_NET_CHAIN_ID: BSC_MAIN_NET_CHAIN_ID,
  BSC_TEST_NET_CHAIN_ID: BSC_TEST_NET_CHAIN_ID,
  GANACHE_DEV_MIRROR_CHAIN_ID: GANACHE_DEV_MIRROR_CHAIN_ID,
  GANACHE_DEV_NET_CHAIN_ID: GANACHE_DEV_NET_CHAIN_ID,
  HARDHAT_TEST_NET_CHAIN_ID: HARDHAT_TEST_NET_CHAIN_ID,
  isRSK: isRSK,
  tokenSymbol: tokenSymbol,
  isMainnet: isMainnet,
};
