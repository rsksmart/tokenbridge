const DOC_TOKEN = { token: 'DOC', name: 'Dollar on Chain', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/doc.png',
    30:{symbol:'DOC', address:'0xe700691da7b9851f2f35f8b8182c69c53ccad9db', decimals:18},
    31:{symbol:'DOC', address:'0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', decimals:18},
    1:{symbol:'eDOC', address:'0x69f6d4D4813F8e2e618DAE7572e04b6D5329E207', decimals:18},
    42:{symbol:'eDOC', address:'0x09a8f2041Be23e8eC3c72790C9A92089BC70FbCa', decimals:18}
};

const DAI_TOKEN = { token: 'DAI', name: 'Dai Stablecoin', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    30:{symbol:'rDAI', address:'0x6b1a73d547f4009a26b8485b63d7015d248ad406', decimals:18},
    31:{symbol:'rKovDAI', address:'0x7b846216a194c69bb1ea52ea8faa92d314866451', decimals:18},
    1:{symbol:'DAI', address:'0x6b175474e89094c44da98b954eedeac495271d0f', decimals:18},
    42:{symbol:'DAI', address:'0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', decimals:18}
};

const SAI_TOKEN = { token: 'SAI', name: 'Sai Stablecoin', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-testnet-contract-metadata/master/images/sai.png',   
    31:{symbol:'rKovSAI', address:'0x0d86fca9be034a363cf12c9834af08d54a10451c', decimals:18},
    42:{symbol:'SAI', address:'0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', decimals:18}
};

const INV_TOKEN = { token: 'INV', name: 'Invest', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/inv.png',
    30:{symbol:'INV', address:'0xe0cff8a40f540657c62eb4cac34b915e5ed8d8ff', decimals:18},
    42:{symbol:'DAI', address:'0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40', decimals:18}
};

const BITPRO_TOKEN = { token: 'BITPRO', name: 'BitPro', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/bpro.png',
    31:{symbol:'BITPRO', address:'0x4da7997a819bb46b6758b9102234c289dd2ad3bf', decimals:18},
    42:{symbol:'eBITPRO', address:'0xB3c9ec8833bfA0d382a183EcED27aBc079520928', decimals:18},
};

const RIF_TOKEN = { token: 'RIF', name: 'RIF', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/rif.png',
    30:{symbol:'RIF', address:'0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', decimals:18},
    31:{symbol:'tRIF', address:'0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', decimals:18},
    1:{symbol:'eRIF', address:'0x73c08467e23f7dcb7ddbbc8d05041b74467a498a', decimals:18},
    42:{symbol:'etRIF', address:'0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', decimals:18}
};

const TUSD_TOKEN = { token: 'TUSD', name: 'True USD', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x0000000000085d4780B73119b644AE5ecd22b376/logo.png',
    31:{symbol:'rKovTUSD', address:'0x0a8d098e31a60da2b9c874d97de6e6b385c28e9d', decimals:18},
    42:{symbol:'TUSD', address:'0x0000000000085d4780B73119b644AE5ecd22b376', decimals:18},
};

const WETH_TOKEN = { token: 'WETH', name: 'Wrapped Ether', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    31:{symbol:'rKovWETH', address:'0xd15cDD74DfF1A6A81Ca639B038839B126BC01FF9', decimals:18},
    42:{symbol:'WETH', address:'0xd0A1E359811322d97991E03f863a0C30C2cF029C', decimals:18},
};

const ZRX_TOKEN = { token: 'ZRX', name: '0x Protocol', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
    31:{symbol:'rKovZRX', address:'0x823b3d62cb5a4ed97f26ed9888ea721b569afe27', decimals:18},
    42:{symbol:'ZRX', address:'0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa', decimals:18},
};

const LINK_TOKEN = { token: 'LINK', name: 'Chainlink Token', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
    30:{symbol:'rLINK', address:'0x14adae34bef7ca957ce2dde5add97ea050123827', decimals:18},
    31:{symbol:'rKovLINK', address:'0x8bbbd80981fe76d44854d8df305e8985c19f0e78', decimals:18},
    1:{symbol:'LINK', address:'0x514910771af9ca656af840dff83e8264ecf986ca', decimals:18},
    42:{symbol:'LINK', address:'0xa36085F69e2889c224210F603D836748e7dC0088', decimals:18},
};

const USDT_TOKEN = { token: 'USDT', name: 'Tether USD', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    30:{symbol:'rUSDT', address:'0xef213441a85df4d7acbdae0cf78004e1e486bb96', decimals:18},
    31:{symbol:'rKovUSDT', address:'0x4cfE225cE54c6609a525768b13F7d87432358C57', decimals:18},
    1:{symbol:'USDT', address:'0xdac17f958d2ee523a2206206994597c13d831ec7', decimals:6},
    42:{symbol:'USDT', address:'0x13512979ade267ab5100878e2e0f485b568328a4', decimals:6},
};

const USDC_TOKEN = { token: 'USDC', name: 'USD Coin', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    30:{symbol:'rUSDC', address:'0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4', decimals:18},
    31:{symbol:'rKovUSDC', address:'0xed3334adb07a3a5947d268e5a8c67b84f5464963', decimals:18},
    1:{symbol:'USDC', address:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals:6},
    42:{symbol:'USDC', address:'0xe22da380ee6b445bb8273c81944adeb6e8450422', decimals:6},
};

const FLIXX_TOKEN = { token: 'FLIXX', name: 'Flixxo', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/flixx.png',
    30:{symbol:'rFLIXX', address:'0x73c08467e23f7dcb7ddbbc8d05041b74467a498a', decimals:18},
    1:{symbol:'FLIXX', address:'0xf04a8ac553fcedb5ba99a64799155826c136b0be', decimals:18},
    //FLIXX does not have a testnet token
};

const RFOX_TOKEN = { token: 'RFOX', name: 'RedFOX Labs', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/rfox.png',
    30:{symbol:'rRFOX', address:'0x9c3a5f8d686fade293c0ce989a62a34408c4e307', decimals:18},
    1:{symbol:'RFOX', address:'0xa1d6df714f91debf4e0802a542e13067f31b8262', decimals:18},
    //RFOX does not have a testnet token
};

const OLD_TOKEN = { token: 'Ω', name: 'Ω Old Mintable', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xE41d2489571d322189246DaFA5ebDe1F4699F498/logo.png',
    31:{symbol:'rΩ', address:'0xdFFF789Db00907D2a59007a58e5b551aa3AD66Ea', decimals:18},
    42:{symbol:'Ω', address:'0x865f275121113b3fe8f91632aeaa4637e8a9f861', decimals:18},
};

const BUND_TOKEN = { token: 'BUND', name: 'Bundles Finance', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/bund.png',
    30:{symbol:'rBUND', address:'0x4991516df6053121121274397a8c1dad608bc95b', decimals:18},
    31:{symbol:'rBUND', address:'0xe95afdfec031f7b9cd942eb7e60f053fb605dfcd', decimals:18},
    1:{symbol:'BUND', address:'0x8d3e855f3f55109d473735ab76f753218400fe96', decimals:18},
    42:{symbol:'BUND', address:'0x8d3e855f3f55109d473735ab76f753218400fe96', decimals:18},
};

const AMLT_TOKEN = { token: 'AMLT', name: 'AMLT Coinfirm', icon: 'https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/amlt.png',
    30:{symbol:'rAMLT', address:'0xff9ea341d9ea91cb7c54342354377f5104fd403f', decimals:18},
    1:{symbol:'AMLT', address:'0xca0e7269600d353f70b14ad118a49575455c0f2f', decimals:18},
    //AMLT does not have a testnet token
};

// Remove INV token because its paused on mainnet
const TOKENS = [ BUND_TOKEN, USDT_TOKEN, DAI_TOKEN, SAI_TOKEN, WETH_TOKEN, LINK_TOKEN, DOC_TOKEN, BITPRO_TOKEN, RIF_TOKEN, TUSD_TOKEN, USDC_TOKEN,
    ZRX_TOKEN, FLIXX_TOKEN, RFOX_TOKEN, OLD_TOKEN, AMLT_TOKEN, ];
