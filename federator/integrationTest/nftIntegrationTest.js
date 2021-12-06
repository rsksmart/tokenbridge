const Web3 = require("web3");
const log4js = require("log4js");
const web3Utils = Web3.utils;
const config = require("../config/test.local.config.js");
const logConfig = require("../config/log-config.json");

const abiMultiSig = require("../../bridge/abi/MultiSigWallet.json");
const abiNFTBridge = require("../../bridge/abi/NFTBridge.json");
const abiNFTERC721TestToken = require("../../bridge/abi/NFTERC721TestToken.json");
const abiSideNFTToken = require("../../bridge/abi/SideNFTToken.json");
const abiDecoder = require("abi-decoder");
const abiAcceptedNFTCrossTransferEvent = abiNFTBridge.find(
  (abi) => abi.name === "Cross"
);
abiDecoder.addABI([abiAcceptedNFTCrossTransferEvent]);

const TransactionSender = require("../src/lib/TransactionSender.js");
const FederatorNFT = require("../src/lib/FederatorNFT.ts");
const utils = require("../src/lib/utils.js");
const fundFederators = require("./fundFederators");
const logger = log4js.getLogger("test");
log4js.configure(logConfig);
logger.info("----------- Transfer Test ---------------------");
logger.info("Mainchain Host", config.mainchain.host);
logger.info("Sidechain Host", config.sidechain.host);
const sideConfig = {
  ...config,
  confirmations: 0,
  mainchain: config.sidechain,
  sidechain: config.mainchain,
};
const mainKeys = process.argv[2]
  ? process.argv[2].replace(/ /g, "").split(",")
  : [];
const sideKeys = process.argv[3]
  ? process.argv[3].replace(/ /g, "").split(",")
  : [];
const mainchainFederators = getMainchainFederators(mainKeys);
const sidechainFederators = getSidechainFederators(sideKeys, sideConfig);
const MAIN_CHAIN_LOGGER_NAME = "MAIN";
const SIDE_CHAIN_LOGGER_NAME = "SIDE";
const NFT_FEDERATOR_LOGGER_CATEGORY = "NFT FEDERATOR";

runNFT({ mainchainFederators, sidechainFederators, config, sideConfig });

function getMainchainFederators(keys) {
  let federators = [];
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new FederatorNFT.FederatorNFT(
        {
          ...config,
          privateKey: key,
          storagePath: `${config.storagePath}/nft-fed-${i + 1}`,
        },
        log4js.getLogger(NFT_FEDERATOR_LOGGER_CATEGORY)
      );
      federators.push(federator);
    });
  } else {
    const federator = new FederatorNFT.FederatorNFT(
      config,
      log4js.getLogger(NFT_FEDERATOR_LOGGER_CATEGORY)
    );
    federators.push(federator);
  }
  return federators;
}

function getSidechainFederators(keys, sideConfig) {
  let federators = [];
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new FederatorNFT.FederatorNFT(
        {
          ...sideConfig,
          privateKey: key,
          storagePath: `${config.storagePath}/nft-side-fed-${i + 1}`,
        },
        log4js.getLogger(NFT_FEDERATOR_LOGGER_CATEGORY)
      );
      federators.push(federator);
    });
  } else {
    const federator = new FederatorNFT.FederatorNFT(
      {
        ...sideConfig,
        storagePath: `${config.storagePath}/side-fed`,
      },
      log4js.getLogger(NFT_FEDERATOR_LOGGER_CATEGORY)
    );
    federators.push(federator);
  }
  return federators;
}

async function runNFT({
  mainchainFederators: originFederators,
  sidechainFederators: destinationFederators,
  config: originConfig,
  sideConfig: destinationConfig,
}) {
  logger.info("[NFT] Starting transfer from Mainchain to Sidechain");
  await transferNFT(
    originFederators,
    destinationFederators,
    originConfig,
    MAIN_CHAIN_LOGGER_NAME,
    SIDE_CHAIN_LOGGER_NAME
  );
  logger.info("[NFT] Completed transfer from Mainchain to Sidechain");

  const invertOriginFederators = destinationFederators;
  const invertDestinationFederators = originFederators;
  logger.info("[NFT] Starting transfer from Sidechain to Mainchain");
  await transferNFT(
    invertOriginFederators,
    invertDestinationFederators,
    destinationConfig,
    SIDE_CHAIN_LOGGER_NAME,
    MAIN_CHAIN_LOGGER_NAME
  );
  logger.info("[NFT] Completed transfer from Sidechain to Mainchain");
}

async function transferNFT(
  originFederators,
  destinationFederators,
  fullConfig,
  originLoggerName,
  destinationLoggerName
) {
  try {
    const originChainWeb3 = new Web3(fullConfig.mainchain.host);
    const originChainId = await originChainWeb3.eth.net.getId();
    const destinationChainWeb3 = new Web3(fullConfig.sidechain.host);
    const destinationChainId = await destinationChainWeb3.eth.net.getId();

    const transactionSender = new TransactionSender(
      originChainWeb3,
      logger,
      fullConfig
    );
    const destinationTransactionSender = new TransactionSender(
      destinationChainWeb3,
      logger,
      fullConfig
    );
    const originNftBridgeAddress = fullConfig.mainchain.nftBridge;
    const destinationNftBridgeAddress = fullConfig.sidechain.nftBridge;
    const originTokenContract = new originChainWeb3.eth.Contract(
      abiNFTERC721TestToken,
      fullConfig.mainchain.testTokenNft
    );
    const originTokenAddress = originTokenContract.options.address;
    const sideMultiSigContract = new originChainWeb3.eth.Contract(
      abiMultiSig,
      fullConfig.sidechain.multiSig
    );
    const originNftBridgeContract = new originChainWeb3.eth.Contract(
      abiNFTBridge,
      originNftBridgeAddress
    );
    const nftBridgeFederation = await originNftBridgeContract.methods
      .getFederation()
      .call();
    logger.info(`Federation from NFT bridge: ${nftBridgeFederation}`);
    const destinationNftBridgeContract = new destinationChainWeb3.eth.Contract(
      abiNFTBridge,
      destinationNftBridgeAddress
    );

    logger.debug("Get the destination token address");

    // Pick token id to mint according to total supply, to be able to run the test N times without redeploying the contracts.
    let tokenSupply = await originTokenContract.methods.totalSupply().call();
    const tokenId = parseInt(tokenSupply);

    const tokenSymbol = "drop";
    const tokenName = "The Drops";
    const tokenBaseURI = "ipfs:/";
    const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";
    const destinationTokenAddress = await getDestinationNFTTokenAddress({
      destinationNftBridgeContract,
      originAddress: originTokenAddress,
      originChainId,
      sideMultiSigContract,
      destinationTransactionSender,
      fullConfig,
      destinationLoggerName,
      symbol: tokenSymbol,
      name: tokenName,
      baseURI: tokenBaseURI,
      contractURI: tokenContractURI,
    });
    const sideTokenContract = new destinationChainWeb3.eth.Contract(
      abiSideNFTToken,
      destinationTokenAddress
    );

    logger.info("------------- SENDING THE TOKENS -----------------");
    logger.debug("Getting address from pk");
    const userPrivateKey = originChainWeb3.eth.accounts.create().privateKey;
    const userAddress = await transactionSender.getAddress(userPrivateKey);
    await transactionSender.sendTransaction(
      userAddress,
      "",
      originChainWeb3.utils.toWei("1"),
      fullConfig.privateKey
    );
    await destinationTransactionSender.sendTransaction(
      userAddress,
      "",
      originChainWeb3.utils.toWei("1"),
      fullConfig.privateKey,
      true
    );
    logger.info(
      `${originLoggerName} token address ${originTokenAddress} - User Address: ${userAddress}`
    );

    let expectedTokenAmount = 0;
    await assertNFTTokenBalanceForUserIsExpected(
      originTokenContract,
      userAddress,
      expectedTokenAmount
    );

    await mintNFTTokenToUser(
      originTokenContract,
      userAddress,
      tokenId,
      transactionSender,
      fullConfig
    );

    expectedTokenAmount = 1;
    await assertNFTTokenBalanceForUserIsExpected(
      originTokenContract,
      userAddress,
      expectedTokenAmount
    );

    await approveBridgeToMoveToken(
      originTokenContract,
      originNftBridgeAddress,
      tokenId,
      userAddress,
      transactionSender,
      userPrivateKey
    );

    const receiveTokensToTxReceipt = await receiveTokensToMainChainBridge({
      originNftBridgeContract,
      originTokenAddress,
      destinationChainId,
      userAddress,
      tokenId,
      transactionSender,
      originNftBridgeAddress,
      userPrivateKey,
    });

    await startAndFundFederators(
      fullConfig,
      originChainWeb3,
      destinationChainWeb3,
      originFederators
    );

    await assertThatNftTokensCrossedToBridge(
      destinationNftBridgeContract,
      receiveTokensToTxReceipt.transactionHash
    );
    logger.info("Tokens were received in side chain Bridge");

    await claimNftTokenInSideChain({
      receiveTokensToTxReceipt,
      destinationNftBridgeContract,
      userAddress,
      tokenId,
      originTokenAddress,
      destinationTransactionSender,
      userPrivateKey,
      originChainId,
    });

    expectedTokenAmount = 0;
    await assertNFTTokenBalanceForUserIsExpected(
      originTokenContract,
      userAddress,
      expectedTokenAmount
    );

    expectedTokenAmount = 1;
    await assertNFTTokenBalanceForUserIsExpected(
      sideTokenContract,
      userAddress,
      expectedTokenAmount
    );
  } catch (err) {
    logger.error("Unhandled error:", err.stack);
    process.exit(1);
  }
}

async function getDestinationNFTTokenAddress({
  destinationNftBridgeContract,
  originAddress,
  originChainId,
  sideMultiSigContract,
  destinationTransactionSender,
  fullConfig,
  destinationLoggerName,
  symbol,
  name,
  baseURI,
  contractURI,
}) {
  let destinationTokenAddress = await destinationNftBridgeContract.methods
    .getSideTokenByOriginalToken(originChainId, originAddress)
    .call();
  if (destinationTokenAddress === utils.zeroAddress) {
    logger.info("Side NFT Token does not exist yet, creating it");
    const bridgeAddress = await destinationNftBridgeContract.options.address;
    const data = destinationNftBridgeContract.methods
      .createSideNFTToken(
        originAddress,
        symbol,
        name,
        baseURI,
        contractURI,
        originChainId
      )
      .encodeABI();
    const multiSigData = sideMultiSigContract.methods
      .submitTransaction(bridgeAddress, 0, data)
      .encodeABI();
    await destinationTransactionSender.sendTransaction(
      fullConfig.sidechain.multiSig,
      multiSigData,
      0,
      "",
      true
    );
    destinationTokenAddress = await destinationNftBridgeContract.methods
      .getSideTokenByOriginalToken(originChainId, originAddress)
      .call();
    if (destinationTokenAddress === utils.zeroAddress) {
      logger.error("Failed to create side NFT token");
      process.exit(1);
    }
  }
  logger.info(
    `${destinationLoggerName} token address`,
    destinationTokenAddress
  );
  return destinationTokenAddress;
}

async function assertThatNftTokensCrossedToBridge(
  nftBridgeContract,
  transactionHash
) {
  const txDataHash = await nftBridgeContract.methods
    .hasCrossed(transactionHash)
    .call();
  if (txDataHash === utils.zeroHash) {
    logger.error("Token was not voted by federators");
    process.exit(1);
  }
}

async function assertNFTTokenBalanceForUserIsExpected(
  tokenContract,
  userAddress,
  expectedTokenAmount
) {
  const nftTokenBalanceForUser = await tokenContract.methods
    .balanceOf(userAddress)
    .call();
  if (
    !web3Utils
      .toBN(nftTokenBalanceForUser)
      .eq(web3Utils.toBN(expectedTokenAmount))
  ) {
    logger.error(
      `User ${userAddress}'s balance for token ${tokenContract.options.address} should be ${expectedTokenAmount} but is ${nftTokenBalanceForUser}`
    );
    process.exit(1);
  }
}

async function mintNFTTokenToUser(
  tokenContract,
  userAddress,
  tokenId,
  transactionSender,
  fullConfig
) {
  const methodCall = tokenContract.methods.safeMint(userAddress, tokenId);
  await methodCall.call({ from: userAddress });
  const data = methodCall.encodeABI();
  await transactionSender.sendTransaction(
    tokenContract.options.address,
    data,
    0,
    fullConfig.privateKey,
    true
  );
}

async function approveBridgeToMoveToken(
  originTokenContract,
  originNftBridgeAddress,
  tokenId,
  userAddress,
  transactionSender,
  userPrivateKey
) {
  const methodCall = originTokenContract.methods.approve(
    originNftBridgeAddress,
    tokenId
  );
  await methodCall.call({ from: userAddress });
  const data = methodCall.encodeABI();
  await transactionSender.sendTransaction(
    originTokenContract.options.address,
    data,
    0,
    userPrivateKey,
    true
  );
}

async function receiveTokensToMainChainBridge({
  originNftBridgeContract,
  originTokenAddress,
  destinationChainId,
  userAddress,
  tokenId,
  transactionSender,
  originNftBridgeAddress,
  userPrivateKey,
}) {
  const methodCall = originNftBridgeContract.methods.receiveTokensTo(
    originTokenAddress,
    userAddress,
    tokenId,
    destinationChainId
  );
  await methodCall.call({ from: userAddress });
  const data = methodCall.encodeABI();
  return transactionSender.sendTransaction(
    originNftBridgeAddress,
    data,
    0,
    userPrivateKey,
    true
  );
}

async function startAndFundFederators(
  fullConfig,
  mainChainWeb3,
  sideChainWeb3,
  originFederators
) {
  const waitBlocks = fullConfig.confirmations || 0;
  logger.debug(`Wait for ${waitBlocks} blocks`);
  await utils.waitBlocks(mainChainWeb3, waitBlocks);

  logger.debug("Starting federator processes");

  // Start origin federators with delay between them.
  logger.debug("Fund federator wallets");
  const federatorKeys =
    mainKeys && mainKeys.length ? mainKeys : [fullConfig.privateKey];
  await fundFederators(
    fullConfig.sidechain.host,
    federatorKeys,
    fullConfig.sidechain.privateKey,
    sideChainWeb3.utils.toWei("1")
  );

  await originFederators.reduce(function (promise, item) {
    return promise.then(function () {
      return item.runAll();
    });
  }, Promise.resolve());
}

async function claimNftTokenInSideChain({
  receiveTokensToTxReceipt,
  destinationNftBridgeContract,
  userAddress,
  tokenId,
  originTokenAddress,
  destinationTransactionSender,
  userPrivateKey,
  originChainId,
}) {
  const acceptTransferEventDecodedLogs = abiDecoder.decodeLogs(
    receiveTokensToTxReceipt.logs
  );
  if (acceptTransferEventDecodedLogs.length !== 1) {
    logger.error(
      `Expected a single accept transfer event to have been emitted, but got ${acceptTransferEventDecodedLogs.length}`
    );
    process.exit(1);
  }

  const acceptTransferEventAddress = acceptTransferEventDecodedLogs[0].address;
  const acceptTransferEventLog = receiveTokensToTxReceipt.logs.find(
    (log) => log.address === acceptTransferEventAddress
  );

  const methodCall = destinationNftBridgeContract.methods.claim({
    to: userAddress,
    from: userAddress,
    tokenId: tokenId,
    tokenAddress: originTokenAddress,
    blockHash: acceptTransferEventLog.blockHash,
    transactionHash: acceptTransferEventLog.transactionHash,
    logIndex: acceptTransferEventLog.logIndex,
    originChainId: originChainId,
  });

  await methodCall.call({ from: userAddress });
  const data = methodCall.encodeABI();
  await destinationTransactionSender.sendTransaction(
    destinationNftBridgeContract.options.address,
    data,
    0,
    userPrivateKey,
    true
  );
}
