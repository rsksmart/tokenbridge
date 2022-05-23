const chains = require('../../hardhat/helper/chains');
const address = require('../../hardhat/helper/address');
const { bscMainnet, bscTestnet } = require('../../hardhat/helper/tokens');


const addTokensToCreate = (tokensToCreate, token, chainId) => {
  const data = {
    _typeId: token.typeId,
    _originalTokenAddress: token.address,
    _originalTokenDecimals: token.decimals,
    _originalTokenSymbol: 'rb' + token.symbol,
    _originalTokenName: `Binance ${token.symbol} on RSK`,
    _originChainId: chainId,
  }
  tokensToCreate.push(data);
}


module.exports = async function (hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, bridgeProxy, multiSig} = await getNamedAccounts();
  const {log} = deployments;
  const chainID = network.config.network_id;

  if(chainID != chains.RSK_MAIN_NET_CHAIN_ID && chainID != chains.RSK_TEST_NET_CHAIN_ID) {
    log(`Not Rsk network, skipping side token creation`);
    return;
  }

  const chainTokens = (chainID == chains.RSK_MAIN_NET_CHAIN_ID ? bscMainnet : bscTestnet)
  const tokens = Object.keys(chainTokens).filter(key => !chainTokens[key].isSideToken).filter(x => !x.isSideToken).map(key => chainTokens[key]);

  const bscChainId = chainID == chains.RSK_MAIN_NET_CHAIN_ID ? chains.BSC_MAIN_NET_CHAIN_ID : chains.BSC_TEST_NET_CHAIN_ID;
  const bridgeArtifact = await deployments.getArtifact('Bridge');
  const multiSigWalletDeployment = await deployments.getArtifact('MultiSigWallet');
  const bridgeContract = new web3.eth.Contract(bridgeArtifact.abi, bridgeProxy);
  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSig);

  let tokensToCreate = [];

  const createMultipleSideTokens = async () => {
  console.log('tokensToCreate', tokensToCreate)
    const methodCallCreateSideToken = bridgeContract.methods.createMultipleSideTokens(tokensToCreate);
    await methodCallCreateSideToken.call({ from: multiSig });
  
    await multiSigContract.methods.submitTransaction(
      bridgeProxy,
      0,
      methodCallCreateSideToken.encodeABI(),
    ).send({ from: deployer, gas: 6790000 });
    log(`MultiSig submitTransaction createSideToken to Bridge`);
  } 

  for (const token of tokens) {
    const sideTokenAddr = await bridgeContract.methods.sideTokenByOriginalToken(bscChainId, token.address).call();
    if (sideTokenAddr.toString() !== address.NULL_ADDRESS) {
      continue;
    }
    
    if (tokensToCreate.length == 3) {
      await createMultipleSideTokens();
      tokensToCreate = [];
    }
    addTokensToCreate(tokensToCreate, token, bscChainId);
  }

  if (tokensToCreate.length > 0) {
    await createMultipleSideTokens();
  }
  
};
module.exports.id = 'create_sideTokens_bsc'; // id required to prevent reexecution
module.exports.tags = ['CreateSideTokensBsc'];
module.exports.dependencies = [];
