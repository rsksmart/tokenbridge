const chains = require('./chains');

const ethereum = {
    WBTC: {address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', typeId: '0', isSideToken: false, decimals: 8, symbol: 'WBTC'}, //WBTC
    renBTC: {address: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', typeId: '0', isSideToken: false, decimals: 8, symbol: 'renBTC'}, //renBTC
    WETH: {address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', typeId: '1', isSideToken: false, decimals: 18, symbol: 'ETH'}, //WETH
    DAI: {address: '0x6b175474e89094c44da98b954eedeac495271d0f', typeId: '4', isSideToken: false, decimals: 18, symbol: 'DAI'}, //DAI
    USDC: {address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', typeId: '5', isSideToken: false, decimals: 6, symbol: 'USDC'}, //USDC
    USDT: {address: '0xdac17f958d2ee523a2206206994597c13d831ec7', typeId: '5', isSideToken: false, decimals: 6, symbol: 'USDT'}, //USDT
    LINK: {address: '0x514910771af9ca656af840dff83e8264ecf986ca', typeId: '3', isSideToken: false, decimals: 18, symbol: 'LINK'}, //LINK
    BUND: {address: '0x8d3e855f3f55109d473735ab76f753218400fe96', typeId: '3', isSideToken: false, decimals: 18, symbol: 'BUND'}, //BUND
    FLIXX: {address: '0xf04a8ac553fcedb5ba99a64799155826c136b0be', typeId: '6', isSideToken: false, decimals: 18, symbol: 'FLIXX'}, //FLIXX
    RFOX: {address: '0xa1d6Df714F91DeBF4e0802A542E13067f31b8262', typeId: '6', isSideToken: false, decimals: 18, symbol: 'RFOX'}, //RFOX
    AMLT: {address: '0xca0e7269600d353f70b14ad118a49575455c0f2f', typeId: '6', isSideToken: false, decimals: 18, symbol: 'AMLT'}, //AMLT
    // Side Tokens
    eRIF: {address: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '5', isSideToken: true, decimals: 18, symbol: 'eRIF'}, //eRIF
    eDOC: {address: '0x69f6d4d4813f8e2e618dae7572e04b6d5329e207', typeId: '4', isSideToken: true, decimals: 18, symbol: 'eDOC'} //eDOC
}

const rskMainnet = {
    DOC: {address: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db', typeId: '5', isSideToken: false, decimals: 18, symbol: 'DOC'}, //DOC
    RIF: {address: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5', typeId: '6', isSideToken: false, decimals: 18, symbol: 'RIF'}, //RIF
    // Side Tokens
    rDAI: {address: '0x6b1a73d547f4009a26b8485b63d7015d248ad406', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rDAI'}, //rDAI
    rUSDC: {address: '0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rUSDC'}, //rUSDC
    rUSDT: {address: '0xef213441a85df4d7acbdae0cf78004e1e486bb96', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rUSDT'}, //rUSDT
    rLINK: {address: '0x14adae34bef7ca957ce2dde5add97ea050123827', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rLINK'}, //rLINK
    rBUND: {address: '0x4991516df6053121121274397a8c1dad608bc95b', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rBUND'}, //rBUND
    rFLIXX: {address: '0x73c08467E23F7DCB7dDBbc8d05041B74467A498A', typeId: '6', isSideToken: true, decimals: 18, symbol: 'rFLIXX'}, //rFLIXX
    rRFOX: {address: '0x9c3a5f8d686fade293c0ce989a62a34408c4e307', typeId: '6', isSideToken: true, decimals: 18, symbol: 'rRFOX'}, //rRFOX
    rAMLT: {address: '0xff9ea341d9ea91cb7c54342354377f5104fd403f', typeId: '6', isSideToken: true, decimals: 18, symbol: 'rAMLT'} //rAMLT
}

const sepolia = {
    WBTC: {address: '0xf864F011C5A97fD8Da79baEd78ba77b47112935a', typeId: '0', isSideToken: false, decimals: 8, symbol: 'WBTC'}, //WBTC
    // TODO renBTC: {address: '', typeId: '0', isSideToken: false, decimals: 18, symbol: 'renBTC'}, //renBTC
    WETH: {address: '0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92', typeId: '1', isSideToken: false, decimals: 18, symbol: 'ETH'}, //WETH
    // TODO SAI: {address: '', typeId: '4', isSideToken: false, decimals: 18, symbol: 'SAI'}, //SAI
    DAI: {address: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', typeId: '4', isSideToken: false, decimals: 18, symbol: 'DAI'}, //DAI
    // TODO TUSD: {address: '', typeId: '4', isSideToken: false, decimals: 18, symbol: 'TUSD'}, //TUSD
    USDC: {address: '0xda9d4f9b69ac6C22e444eD9aF0CfC043b7a7f53f', typeId: '4', isSideToken: false, decimals: 6, symbol: 'USDC'}, //USDC
    USDT: {address: '0x0Bd5F04B456ab34a2aB3e9d556Fe5b3A41A0BC8D', typeId: '4', isSideToken: false, decimals: 6, symbol: 'USDT'}, //USDT
    LINK: {address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', typeId: '3', isSideToken: false, decimals: 18, symbol: 'LINK'}, //LINK
    // TODO BUND: {address: '', typeId: '3', isSideToken: false, decimals: 18, symbol: 'BUND'}, //BUND
    // SideToken
    // TODO eRIF: {address: '', typeId: '5', isSideToken: true, decimals: 18, symbol: 'eRIF'}, //eRIF
    // TODO eDOC: {address: '', typeId: '4', isSideToken: true, decimals: 18, symbol: 'eDOC'}, //eDOC
    // TODO eBPro: {address: '', typeId: '0', isSideToken: true, decimals: 18, symbol: 'eBPro'} //eBPro
}

const rskTestnet = {
    DOC: {address: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0', typeId: '5', isSideToken: false, decimals: 18, symbol: 'DOC'}, //DOC
    RIF: {address: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', typeId: '6', isSideToken: false, decimals: 18, symbol: 'RIF'}, //RIF
    BPro: {address: '0x4da7997a819bb46b6758b9102234c289dd2ad3bf', typeId: '0', isSideToken: false, decimals: 18, symbol: 'BPro'}, //BPro
    // Side Tokens
    rDAI: {address: '0xE283333e5d618a65E9F0ec25f9893ba39674c63B', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovDAI'}, //rKovDAI
    rUSDT: {address: '0xE283333e5d618a65E9F0ec25f9893ba39674c63B', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovUSDT'}, //rKovUSDT
    rLINK: {address: '0x2d850c8E369F26bc02fF4c9fFbaE2d50107395CB', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rKovLINK'}, //rKovLINK
}

const rskAlphanet = {
    DOC: {address: '0xeD8413b2493F27121e4BC1222aB287316ad29716', typeId: '5', isSideToken: false, decimals: 18, symbol: 'DOC'}, //DOC
    RIF: {address: '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe', typeId: '6', isSideToken: false, decimals: 18, symbol: 'RIF'}, //RIF
    BPro: {address: '0x6905711e16AFBC51d8cf2a714479D14FB3e03281', typeId: '0', isSideToken: false, decimals: 18, symbol: 'BPro'}, //BPro
    // Side Tokens
    rDAI: {address: '0x8384952Dc2A3e413800e9D4EE89d7383FA12Af10', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovDAI'}, //rKovDAI
    rUSDT: {address: '0x52b0108b38Ae80305F92FC461026e4c200ed673E', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovUSDT'}, //rKovUSDT
    rLINK: {address: '0x2d850c8E369F26bc02fF4c9fFbaE2d50107395CB', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rKovLINK'}, //rKovLINK
}

const tokensByChainId = (chainId) => {
    switch (chainId) {
        case chains.RSK_TEST_NET_CHAIN_ID:
            return rskTestnet;

        case chains.SEPOLIA_TEST_NET_CHAIN_ID:
            return sepolia;

        case chains.RSK_MAIN_NET_CHAIN_ID:
            return rskMainnet;

        case chains.ETHEREUM_MAIN_NET_CHAIN_ID:
            return ethereum;

        case chains.RSK_ALPHA_NET_CHAIN_ID:
            return rskAlphanet;

        default:
            return [];
    }

}

module.exports = {
    tokensByChainId,
    ethereum,
    rskMainnet,
    rskTestnet,
    sepolia
};
