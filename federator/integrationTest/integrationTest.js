const fs = require("fs");
const Web3 = require("web3");
const log4js = require("log4js");

//configurations
// the following file should only be used for integration tests
const config = require("../config/test.local.config.js");
const logConfig = require("../config/log-config.json");
const abiBridgeV3 = require("../../bridge/abi/BridgeV3.json");
const abiMainToken = require("../../bridge/abi/MainToken.json");
const abiSideToken = require("../../bridge/abi/SideToken.json");
const abiAllowTokensV1 = require("../../bridge/abi/AllowTokensV1.json");
const abiMultiSig = require("../../bridge/abi/MultiSigWallet.json");

//utils
const TransactionSender = require("../src/lib/TransactionSender.js");
const Federator = require("../src/lib/Federator.js");
const utils = require("../src/lib/utils.js");
const fundFederators = require("./fundFederators");
const MSG_TOKEN_NOT_VOTED = "Token was not voted by federators";

const sideTokenBytecode = fs.readFileSync(
  `${__dirname}/sideTokenBytecode.txt`,
  "utf8"
);

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

const mainchainFederators = getFederators(config, mainKeys);
const sidechainFederators = getFederators(sideConfig, sideKeys, "side-fed");

const ONE_DAY_IN_SECONDS = 24 * 3600;
const SIDE_TOKEN_SYMBOL = "MAIN";
const SIDE_TOKEN_NAME = "MAIN";
const MAIN_CHAIN_LOGGER_NAME = "MAIN";
const SIDE_CHAIN_LOGGER_NAME = "SIDE";
const SIDE_TOKEN_TYPE_ID = 0;
const SIDE_TOKEN_DECIMALS = 18;

run(mainchainFederators, sidechainFederators, config, sideConfig);

function getFederators(configFile, keys, storagePathPrefix = "fed") {
  const federators = [];
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new Federator(
        {
          ...configFile,
          privateKey: key,
          storagePath: `${configFile.storagePath}/${storagePathPrefix}-${
            i + 1
          }`,
        },
        log4js.getLogger("FEDERATOR")
      );
      federators.push(federator);
    });
  } else {
    federators.push(
      new Federator(
        {
          ...configFile,
          storagePath: `${config.storagePath}/${storagePathPrefix}`,
        },
        log4js.getLogger("FEDERATOR")
      )
    );
  }
  return federators;
}

async function run(
  federatorsMainChain,
  federatorsSideChain,
  configMain,
  configSide
) {
  logger.info("Starting transfer from Mainchain to Sidechain");
  await transfer(
    federatorsMainChain,
    federatorsSideChain,
    configMain,
    MAIN_CHAIN_LOGGER_NAME,
    SIDE_CHAIN_LOGGER_NAME
  );
  logger.info("Completed transfer from Mainchain to Sidechain");

  logger.info("Starting transfer from Sidechain to Mainchain");
  await transfer(
    federatorsSideChain,
    federatorsMainChain,
    configSide,
    SIDE_CHAIN_LOGGER_NAME,
    MAIN_CHAIN_LOGGER_NAME
  );
  logger.info("Completed transfer from Sidechain to Mainchain");
}

async function checkAddressBalance(tokenContract, userAddress, loggerName) {
  const balance = await tokenContract.methods.balanceOf(userAddress).call();
  logger.info(`${loggerName} token balance`, balance);
  if (balance.toString() === "0") {
    logger.error("Token was not claimed");
    process.exit(1);
  }
}

async function checkTxDataHash(bridgeContract, receipt) {
  const txDataHash = await bridgeContract.methods
    .transactionsDataHashes(receipt.transactionHash)
    .call();
  if (txDataHash === utils.zeroHash) {
    logger.error(MSG_TOKEN_NOT_VOTED);
    process.exit(1);
  }
}

async function sendFederatorTx(
  multiSigAddr,
  multiSigContract,
  tokenAddr,
  dataAbi,
  federatorKeys,
  transactionSender
) {
  const multiSigSubmitData = multiSigContract.methods
    .submitTransaction(tokenAddr, 0, dataAbi)
    .encodeABI();

  if (federatorKeys.length === 1) {
    await transactionSender.sendTransaction(
      multiSigAddr,
      multiSigSubmitData,
      0,
      "",
      true
    );
  } else {
    await transactionSender.sendTransaction(
      multiSigAddr,
      multiSigSubmitData,
      0,
      federatorKeys[0],
      true
    );

    const nextTransactionCount = await multiSigContract.methods
      .getTransactionCount(true, false)
      .call();
    for (let i = 1; i < federatorKeys.length; i++) {
      const multiSigConfirmTxData = multiSigContract.methods
        .confirmTransaction(nextTransactionCount)
        .encodeABI();
      await transactionSender.sendTransaction(
        multiSigAddr,
        multiSigConfirmTxData,
        0,
        federatorKeys[i],
        true
      );
    }
  }
}

async function transferReceiveTokensOtherSide({
  destinationBridgeContract,
  receiptSendTransaction,
  userAddress,
  amount,
  destinationTransactionSender,
  destinationBridgeAddress,
  userPrivateKey,
  destinationLoggerName,
  destinationTokenContract,
  mainChainWeb3,
}) {
  await checkTxDataHash(destinationBridgeContract, receiptSendTransaction);

  await claimTokensFromDestinationBridge(
    destinationBridgeContract,
    userAddress,
    amount,
    receiptSendTransaction,
    destinationTransactionSender,
    destinationBridgeAddress,
    userPrivateKey
  );

  logger.debug("Check balance on the other side");
  await checkAddressBalance(
    destinationTokenContract,
    userAddress,
    destinationLoggerName
  );

  const crossCompletedBalance = await mainChainWeb3.eth.getBalance(userAddress);
  logger.debug(
    "One way cross user balance (ETH or RBTC)",
    crossCompletedBalance
  );
}

function checkBalance(currentBalance, expectedBalance) {
  if (expectedBalance !== BigInt(currentBalance)) {
    logger.error(
      `Wrong balance. Expected ${expectedBalance} but got ${currentBalance}`
    );
    process.exit(1);
  }
}

async function getUsersBalances(
  originTokenContract,
  destinationTokenContract,
  originBridgeAddress,
  userAddress
) {
  const bridgeBalance = await originTokenContract.methods
    .balanceOf(originBridgeAddress)
    .call();
  const receiverBalance = await originTokenContract.methods
    .balanceOf(userAddress)
    .call();
  const senderBalance = await destinationTokenContract.methods
    .balanceOf(userAddress)
    .call();
  logger.debug(
    `bridge balance:${bridgeBalance}, receiver balance:${receiverBalance}, sender balance:${senderBalance} `
  );
  return {
    bridgeBalance,
    receiverBalance,
    senderBalance,
  };
}

async function runFederators(federators) {
  await federators.reduce(function (promise, item) {
    return promise.then(function () {
      return item.run();
    });
  }, Promise.resolve());
}

async function transferBackTokens({
  destinationTokenContract,
  userAddress,
  destinationTransactionSender,
  configChain,
  destinationBridgeAddress,
  amount,
  destinationTokenAddress,
  userPrivateKey,
  sideMultiSigContract,
  sideAllowTokensAddress,
  federatorKeys,
  destinationBridgeContract,
  mainChainWeb3,
  destinationFederators,
}) {
  await destinationTransactionSender.sendTransaction(
    userAddress,
    "",
    6000000,
    configChain.privateKey,
    true
  );

  logger.debug("Approving token transfer on destination");
  const dataApproveAbi = destinationTokenContract.methods
    .approve(destinationBridgeAddress, amount)
    .encodeABI();
  await destinationTransactionSender.sendTransaction(
    destinationTokenAddress,
    dataApproveAbi,
    0,
    userPrivateKey,
    true
  );
  logger.debug("Token transfer approved");
  const allowed = await destinationTokenContract.methods
    .allowance(userAddress, destinationBridgeAddress)
    .call();
  logger.debug("Allowed to transfer ", allowed);
  logger.debug("Set side token limit");

  await sendFederatorTx(
    configChain.sidechain.multiSig,
    sideMultiSigContract,
    sideAllowTokensAddress,
    dataApproveAbi,
    federatorKeys,
    destinationTransactionSender
  );

  logger.debug("Bridge side receiveTokens");
  const callReceiveTokens = destinationBridgeContract.methods.receiveTokensTo(
    destinationTokenAddress,
    userAddress,
    amount
  );
  await callReceiveTokens.call({ from: userAddress });
  const receiptReceiveTokensTo =
    await destinationTransactionSender.sendTransaction(
      destinationBridgeAddress,
      callReceiveTokens.encodeABI(),
      0,
      userPrivateKey,
      true
    );
  logger.debug("Bridge side receiveTokens completed");

  logger.debug("Starting federator processes");

  logger.debug("Fund federator wallets");
  federatorKeys =
    sideKeys && sideKeys.length ? sideKeys : [configChain.privateKey];
  await fundFederators(
    configChain.mainchain.host,
    federatorKeys,
    configChain.mainchain.privateKey,
    mainChainWeb3.utils.toWei("1")
  );

  await runFederators(destinationFederators);
  return receiptReceiveTokensTo;
}

async function tranferCheckAmounts({
  allowTokensContract,
  configChain,
  multiSigContract,
  allowTokensAddress,
  cowAddress,
  mainChainWeb3,
  anotherTokenContract,
  userAddress,
  amount,
  transactionSender,
  anotherTokenAddress,
  userPrivateKey,
  destTokenContract,
  destinationLoggerName,
  destinationBridgeContract,
  sideChainWeb3,
  originBridgeAddress,
  bridgeContract,
  originFederators,
  destinationTransactionSender,
  destinationBridgeAddress,
}) {
  logger.info(
    "------------- SMALL, MEDIUM and LARGE amounts are processed after required confirmations  -----------------"
  );

  await allowTokensContract.methods
    .setConfirmations("100", "1000", "2000")
    .call({ from: configChain.mainchain.multiSig });
  const dataTransferSetConfirmations = allowTokensContract.methods
    .setConfirmations("100", "1000", "2000")
    .encodeABI();

  const methodCallSetConfirmations = multiSigContract.methods.submitTransaction(
    allowTokensAddress,
    0,
    dataTransferSetConfirmations
  );
  await methodCallSetConfirmations.call({ from: cowAddress });
  await methodCallSetConfirmations.send({ from: cowAddress, gas: 500000 });

  await utils.evm_mine(1, mainChainWeb3);
  const confirmations = await allowTokensContract.methods
    .getConfirmations()
    .call();

  const dataMintAbi = anotherTokenContract.methods
    .mint(userAddress, amount, "0x", "0x")
    .encodeABI();
  await transactionSender.sendTransaction(
    anotherTokenAddress,
    dataMintAbi,
    0,
    userPrivateKey,
    true
  );
  let remainingUserBalance = await mainChainWeb3.eth.getBalance(userAddress);
  logger.debug(
    "user native token balance before crossing tokens:",
    remainingUserBalance
  );

  const userBalanceAnotherToken = await anotherTokenContract.methods
    .balanceOf(userAddress)
    .call();
  logger.debug("user balance before crossing tokens:", userBalanceAnotherToken);
  balance = await destTokenContract.methods.balanceOf(userAddress).call();
  logger.info(
    `${destinationLoggerName} token balance before crossing`,
    balance
  );

  const anotherTokenOriginalAddr = await destinationBridgeContract.methods
    .mappedTokens(anotherTokenAddress)
    .call();
  logger.info(
    `${destinationLoggerName} token address`,
    anotherTokenOriginalAddr
  );
  if (anotherTokenOriginalAddr === utils.zeroAddress) {
    logger.error(MSG_TOKEN_NOT_VOTED);
    process.exit(1);
  }

  logger.debug("Check balance on the other side before crossing");
  const destSideTokenContract = new sideChainWeb3.eth.Contract(
    abiSideToken,
    anotherTokenOriginalAddr
  );
  balance = await destSideTokenContract.methods.balanceOf(userAddress).call();
  logger.info(`${destinationLoggerName} token balance`, balance);
  let destinationInitialUserBalance = balance;

  // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
  const userSmallAmount = mainChainWeb3.utils.toWei("0.0056");
  const userMediumAmount = mainChainWeb3.utils.toWei("0.019"); // < toWei('0.1')
  const userLargeAmount = mainChainWeb3.utils.toWei("1.32");
  const userAppoveTotalAmount = mainChainWeb3.utils.toWei("10");

  logger.debug(
    "Send small amount, medium amount and large amount transactions"
  );
  const methodCallApprove = anotherTokenContract.methods.approve(
    originBridgeAddress,
    userAppoveTotalAmount
  );
  await methodCallApprove.call({ from: userAddress });
  await transactionSender.sendTransaction(
    anotherTokenAddress,
    methodCallApprove.encodeABI(),
    0,
    userPrivateKey,
    true
  );

  // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
  const methodCallReceiveTokensTo = bridgeContract.methods.receiveTokensTo(
    anotherTokenAddress,
    userAddress,
    userSmallAmount
  );
  await methodCallReceiveTokensTo.call({ from: userAddress });
  const smallAmountReceipt = await transactionSender.sendTransaction(
    originBridgeAddress,
    methodCallReceiveTokensTo.encodeABI(),
    0,
    userPrivateKey,
    true
  );

  // Cross AnotherToken (type id 0) Medium Amount >= toWei('0.01') && < toWei('0.1')
  const callerReceiveTokensTo = bridgeContract.methods.receiveTokensTo(
    anotherTokenAddress,
    userAddress,
    userMediumAmount
  );
  await callerReceiveTokensTo.call({ from: userAddress });
  const mediumAmountReceipt = await transactionSender.sendTransaction(
    originBridgeAddress,
    callerReceiveTokensTo.encodeABI(),
    0,
    userPrivateKey,
    true
  );

  // Cross AnotherToken (type id 0) Large Amount >= toWei('0.1')
  const callerReceiveTokensLarge = bridgeContract.methods.receiveTokensTo(
    anotherTokenAddress,
    userAddress,
    userLargeAmount
  );
  await callerReceiveTokensLarge.call({ from: userAddress });
  const largeAmountReceipt = await transactionSender.sendTransaction(
    originBridgeAddress,
    callerReceiveTokensLarge.encodeABI(),
    0,
    userPrivateKey,
    true
  );

  logger.debug("Mine small amount confirmations blocks");
  const delta_1 = parseInt(confirmations.smallAmount);
  await utils.evm_mine(delta_1, mainChainWeb3);

  await runFederators(originFederators);
  logger.debug("Claim small amounts");
  const methodCallClaim = destinationBridgeContract.methods.claim({
    to: userAddress,
    amount: userSmallAmount,
    blockHash: smallAmountReceipt.blockHash,
    transactionHash: smallAmountReceipt.transactionHash,
    logIndex: smallAmountReceipt.logs[4].logIndex,
  });
  await methodCallClaim.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    methodCallClaim.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Small amount claim completed");

  // check small amount txn went through
  let balance = await destSideTokenContract.methods
    .balanceOf(userAddress)
    .call();
  logger.info(
    `DESTINATION ${destinationLoggerName} token balance after ${delta_1} confirmations`,
    balance
  );

  const expectedBalanceUser =
    BigInt(destinationInitialUserBalance) + BigInt(userSmallAmount);
  if (expectedBalanceUser !== BigInt(balance)) {
    logger.error(
      `userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceUser} but got ${balance}`
    );
    process.exit(1);
  }

  logger.debug("Mine medium amount confirmations blocks");
  const delta_2 = parseInt(confirmations.mediumAmount) - delta_1;
  await utils.evm_mine(delta_2, mainChainWeb3);

  await runFederators(originFederators);
  logger.debug("Claim medium amounts");
  const callerClaim = destinationBridgeContract.methods.claim({
    to: userAddress,
    amount: userMediumAmount,
    blockHash: mediumAmountReceipt.blockHash,
    transactionHash: mediumAmountReceipt.transactionHash,
    logIndex: mediumAmountReceipt.logs[4].logIndex,
  });
  await callerClaim.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    callerClaim.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Medium amount claim completed");

  // check medium amount txn went through
  balance = await destSideTokenContract.methods.balanceOf(userAddress).call();
  logger.info(
    `DESTINATION ${destinationLoggerName} token balance after ${
      delta_1 + delta_2
    } confirmations`,
    balance
  );

  const expectedBalanceUsers =
    BigInt(destinationInitialUserBalance) +
    BigInt(userMediumAmount) +
    BigInt(userSmallAmount);
  if (expectedBalanceUsers !== BigInt(balance)) {
    logger.error(
      `userMediumAmount + userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceUsers} but got ${balance}`
    );
    process.exit(1);
  }

  logger.debug("Mine large amount confirmations blocks");
  const delta_3 = parseInt(confirmations.largeAmount) - delta_2;
  await utils.evm_mine(delta_3, mainChainWeb3);

  await runFederators(originFederators);
  logger.debug("Claim large amounts");
  const callerClaimDestination = destinationBridgeContract.methods.claim({
    to: userAddress,
    amount: userLargeAmount,
    blockHash: largeAmountReceipt.blockHash,
    transactionHash: largeAmountReceipt.transactionHash,
    logIndex: largeAmountReceipt.logs[4].logIndex,
  });
  await callerClaimDestination.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    callerClaimDestination.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Large amount claim completed");

  // check large amount txn went through
  const destBalance = await destSideTokenContract.methods
    .balanceOf(userAddress)
    .call();
  logger.info(
    `DESTINATION ${destinationLoggerName} token balance after ${
      delta_1 + delta_2 + delta_3
    } confirmations`,
    destBalance
  );

  const expectedBalanceAll =
    BigInt(destinationInitialUserBalance) +
    BigInt(userLargeAmount) +
    BigInt(userMediumAmount) +
    BigInt(userSmallAmount);
  if (expectedBalanceAll !== BigInt(destBalance)) {
    logger.error(
      `Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceAll} but got ${destBalance}`
    );
    process.exit(1);
  }

  logger.debug(
    "ORIGIN user balance after crossing:",
    await anotherTokenContract.methods.balanceOf(userAddress).call()
  );

  return { confirmations };
}
async function transferCheckErc777ReceiveTokensOtherSide({
  destinationBridgeContract,
  userAddress,
  amount,
  receiptSend,
  destinationTransactionSender,
  destinationBridgeAddress,
  userPrivateKey,
  sideChainWeb3,
  destinationAnotherTokenAddress,
  destinationLoggerName,
  mainChainWeb3,
  waitBlocks,
  destinationFederators,
  bridgeContract,
  originBridgeAddress,
  originTokenContract,
}) {
  logger.info(
    "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
  );

  await claimTokensFromDestinationBridge(
    destinationBridgeContract,
    userAddress,
    amount,
    receiptSend,
    destinationTransactionSender,
    destinationBridgeAddress,
    userPrivateKey
  );

  const destTokenContract = new sideChainWeb3.eth.Contract(
    abiSideToken,
    destinationAnotherTokenAddress
  );

  logger.debug("Check balance on the other side");
  await checkAddressBalance(
    destTokenContract,
    userAddress,
    destinationLoggerName
  );

  const crossUsrBalance = await mainChainWeb3.eth.getBalance(userAddress);
  logger.debug("One way cross user balance", crossUsrBalance);

  logger.info(
    "------------- CONTRACT ERC777 TEST TRANSFER BACK THE TOKENS -----------------"
  );
  const senderBalanceBeforeErc777 = await destTokenContract.methods
    .balanceOf(userAddress)
    .call();

  const methodSendCall = destTokenContract.methods.send(
    destinationBridgeAddress,
    amount,
    "0x"
  );
  methodSendCall.call({ from: userAddress });
  const receiptSendTx = await destinationTransactionSender.sendTransaction(
    destinationAnotherTokenAddress,
    methodSendCall.encodeABI(),
    0,
    userPrivateKey,
    true
  );

  logger.debug(`Wait for ${waitBlocks} blocks`);
  await utils.waitBlocks(sideChainWeb3, waitBlocks);

  await runFederators(destinationFederators);
  await checkTxDataHash(bridgeContract, receiptSendTx);

  logger.info(
    "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
  );
  const methodCallClaim = bridgeContract.methods.claim({
    to: userAddress,
    amount: amount,
    blockHash: receiptSendTx.blockHash,
    transactionHash: receiptSendTx.transactionHash,
    logIndex: receiptSendTx.logs[5].logIndex,
  });
  await methodCallClaim.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    originBridgeAddress,
    methodCallClaim.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Destination Bridge claim completed");
  logger.debug("Getting final balances");

  const { senderBalance: senderBalanceAfterErc777 } = await getUsersBalances(
    originTokenContract,
    destTokenContract,
    originBridgeAddress,
    userAddress
  );

  if (senderBalanceBeforeErc777 === BigInt(senderBalanceAfterErc777)) {
    logger.error(
      `Wrong Sender balance. Expected Sender balance to change but got ${senderBalanceAfterErc777}`
    );
    process.exit(1);
  }

  const crossBackCompletedBalance = await mainChainWeb3.eth.getBalance(
    userAddress
  );
  logger.debug("Final user balance", crossBackCompletedBalance);

  return {
    destTokenContract,
  };
}

async function transferCheckStartErc777({
  mainChainWeb3,
  userAddress,
  amount,
  transactionSender,
  userPrivateKey,
  configChain,
  allowTokensContract,
  federatorKeys,
  destinationBridgeContract,
  sideMultiSigContract,
  destinationTransactionSender,
  destinationLoggerName,
  originBridgeAddress,
  waitBlocks,
  originFederators,
}) {
  logger.info(
    "------------- START CONTRACT ERC777 TEST TOKEN SEND TEST -----------------"
  );
  const AnotherToken = new mainChainWeb3.eth.Contract(abiSideToken);
  const knownAccount = (await mainChainWeb3.eth.getAccounts())[0];

  logger.debug("Deploying another token contract");
  const anotherTokenContract = await AnotherToken.deploy({
    data: sideTokenBytecode,
    arguments: ["MAIN", "MAIN", userAddress, "1"],
  }).send({
    from: knownAccount,
    gas: 6700000,
    gasPrice: 20000000000,
  });
  logger.debug("Token deployed");
  logger.debug("Minting new token");
  const anotherTokenAddress = anotherTokenContract.options.address;
  const dataMintAbi = anotherTokenContract.methods
    .mint(userAddress, amount, "0x", "0x")
    .encodeABI();
  await transactionSender.sendTransaction(
    anotherTokenAddress,
    dataMintAbi,
    0,
    userPrivateKey,
    true
  );

  logger.debug("Adding new token to list of allowed on bridge");
  const multiSigContract = new mainChainWeb3.eth.Contract(
    abiMultiSig,
    configChain.mainchain.multiSig
  );
  const allowTokensAddress = allowTokensContract.options.address;
  const setTokenEncodedAbi = allowTokensContract.methods
    .setToken(anotherTokenAddress, SIDE_TOKEN_TYPE_ID)
    .encodeABI();

  await sendFederatorTx(
    configChain.mainchain.multiSig,
    multiSigContract,
    allowTokensAddress,
    setTokenEncodedAbi,
    federatorKeys,
    transactionSender
  );

  const destinationAnotherTokenAddress = await getDestinationTokenAddress(
    destinationBridgeContract,
    anotherTokenAddress,
    sideMultiSigContract,
    destinationTransactionSender,
    configChain,
    destinationLoggerName
  );

  const methodCallSend = anotherTokenContract.methods.send(
    originBridgeAddress,
    amount,
    "0x"
  );
  await methodCallSend.call({ from: userAddress });
  const receiptSend = await transactionSender.sendTransaction(
    anotherTokenAddress,
    methodCallSend.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Call to transferAndCall completed");

  logger.debug(`Wait for ${waitBlocks} blocks`);
  await utils.waitBlocks(mainChainWeb3, waitBlocks);

  await runFederators(originFederators);

  return {
    anotherTokenAddress,
    anotherTokenContract,
    allowTokensAddress,
    multiSigContract,
    destinationAnotherTokenAddress,
    receiptSend,
  };
}

async function transfer(
  originFederators,
  destinationFederators,
  configChain,
  originLoggerName,
  destinationLoggerName
) {
  try {
    const mainChainWeb3 = new Web3(configChain.mainchain.host);
    const sideChainWeb3 = new Web3(configChain.sidechain.host);
    // Increase time in one day to reset all the Daily limits from AllowTokens
    await utils.increaseTimestamp(mainChainWeb3, ONE_DAY_IN_SECONDS + 1);
    await utils.increaseTimestamp(sideChainWeb3, ONE_DAY_IN_SECONDS + 1);

    const originTokenContract = new mainChainWeb3.eth.Contract(
      abiMainToken,
      configChain.mainchain.testToken
    );
    const transactionSender = new TransactionSender(
      mainChainWeb3,
      logger,
      configChain
    );
    const destinationTransactionSender = new TransactionSender(
      sideChainWeb3,
      logger,
      configChain
    );
    const originBridgeAddress = configChain.mainchain.bridge;
    const amount = mainChainWeb3.utils.toWei("10");
    const originAddress = originTokenContract.options.address;
    const cowAddress = (await mainChainWeb3.eth.getAccounts())[0];
    const allowTokensContract = new mainChainWeb3.eth.Contract(
      abiAllowTokensV1,
      configChain.mainchain.allowTokens
    );
    const sideMultiSigContract = new mainChainWeb3.eth.Contract(
      abiMultiSig,
      configChain.sidechain.multiSig
    );
    const sideAllowTokensAddress = configChain.sidechain.allowTokens;
    const destinationBridgeAddress = configChain.sidechain.bridge;
    logger.debug(
      `${destinationLoggerName} bridge address`,
      destinationBridgeAddress
    );
    const destinationBridgeContract = new sideChainWeb3.eth.Contract(
      abiBridgeV3,
      destinationBridgeAddress
    );

    let dataTransfer = "";
    let methodCall = "";

    logger.debug("Get the destination token address");
    const destinationTokenAddress = await getDestinationTokenAddress(
      destinationBridgeContract,
      originAddress,
      sideMultiSigContract,
      destinationTransactionSender,
      configChain,
      destinationLoggerName
    );

    logger.info("------------- SENDING THE TOKENS -----------------");
    logger.debug("Getting address from pk");
    const userPrivateKey = mainChainWeb3.eth.accounts.create().privateKey;
    const userAddress = await transactionSender.getAddress(userPrivateKey);
    await transactionSender.sendTransaction(
      userAddress,
      "",
      mainChainWeb3.utils.toWei("1"),
      configChain.privateKey
    );
    await destinationTransactionSender.sendTransaction(
      userAddress,
      "",
      mainChainWeb3.utils.toWei("1"),
      configChain.privateKey,
      true
    );
    logger.info(
      `${originLoggerName} token address ${originAddress} - User Address: ${userAddress}`
    );

    const initialUserBalance = await mainChainWeb3.eth.getBalance(userAddress);
    logger.debug("Initial user balance ", initialUserBalance);
    await originTokenContract.methods
      .transfer(userAddress, amount)
      .send({ from: cowAddress });
    const initialTokenBalance = await originTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug("Initial token balance ", initialTokenBalance);

    logger.debug("Approving token transfer");
    await originTokenContract.methods
      .transfer(userAddress, amount)
      .call({ from: userAddress });
    const methodTransferData = originTokenContract.methods
      .transfer(userAddress, amount)
      .encodeABI();
    await transactionSender.sendTransaction(
      originAddress,
      methodTransferData,
      0,
      configChain.privateKey,
      true
    );
    await originTokenContract.methods
      .approve(originBridgeAddress, amount)
      .call({ from: userAddress });

    const methodApproveData = originTokenContract.methods
      .approve(originBridgeAddress, amount)
      .encodeABI();
    await transactionSender.sendTransaction(
      originAddress,
      methodApproveData,
      0,
      userPrivateKey,
      true
    );
    logger.debug("Token transfer approved");

    logger.debug("Bridge receiveTokens (transferFrom)");
    const bridgeContract = new mainChainWeb3.eth.Contract(
      abiBridgeV3,
      originBridgeAddress
    );
    logger.debug("Bridge addr", originBridgeAddress);
    logger.debug("allowTokens addr", allowTokensContract.options.address);
    logger.debug(
      "Bridge AllowTokensAddr",
      await bridgeContract.methods.allowTokens().call()
    );
    logger.debug(
      "allowTokens primary",
      await allowTokensContract.methods.primary().call()
    );
    logger.debug(
      "allowTokens owner",
      await allowTokensContract.methods.owner().call()
    );
    logger.debug("accounts:", await mainChainWeb3.eth.getAccounts());
    const methodCallReceiveTokensTo = bridgeContract.methods.receiveTokensTo(
      originAddress,
      userAddress,
      amount
    );
    await methodCallReceiveTokensTo.call({ from: userAddress });
    const receiptSendTransaction = await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCallReceiveTokensTo.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Bridge receivedTokens completed");

    const waitBlocks = configChain.confirmations || 0;
    logger.debug(`Wait for ${waitBlocks} blocks`);
    await utils.waitBlocks(mainChainWeb3, waitBlocks);

    logger.debug("Starting federator processes");

    // Start origin federators with delay between them
    logger.debug("Fund federator wallets");
    const federatorKeys =
      mainKeys && mainKeys.length ? mainKeys : [configChain.privateKey];
    await fundFederators(
      configChain.sidechain.host,
      federatorKeys,
      configChain.sidechain.privateKey,
      sideChainWeb3.utils.toWei("1")
    );

    await runFederators(originFederators);
    logger.info(
      "------------- RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
    );

    const destinationTokenContract = new sideChainWeb3.eth.Contract(
      abiSideToken,
      destinationTokenAddress
    );

    await transferReceiveTokensOtherSide({
      destinationBridgeContract,
      receiptSendTransaction,
      userAddress,
      amount,
      destinationTransactionSender,
      destinationBridgeAddress,
      userPrivateKey,
      destinationLoggerName,
      destinationTokenContract,
      mainChainWeb3,
    });

    // Transfer back
    logger.info("------------- TRANSFER BACK THE TOKENS -----------------");
    logger.debug("Getting initial balances before transfer");
    const {
      bridgeBalance: bridgeBalanceBefore,
      receiverBalance: receiverBalanceBefore,
      senderBalance: senderBalanceBefore,
    } = await getUsersBalances(
      originTokenContract,
      destinationTokenContract,
      originBridgeAddress,
      userAddress
    );

    const receiptReceiveTokensTo = await transferBackTokens({
      destinationTokenContract,
      userAddress,
      destinationTransactionSender,
      configChain,
      destinationBridgeAddress,
      amount,
      destinationTokenAddress,
      userPrivateKey,
      sideMultiSigContract,
      sideAllowTokensAddress,
      federatorKeys,
      destinationBridgeContract,
      mainChainWeb3,
      destinationFederators,
    });

    logger.info(
      "------------- RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
    );
    logger.debug("Check balance on the starting side");
    methodCall = bridgeContract.methods.claim({
      to: userAddress,
      amount: amount,
      blockHash: receiptReceiveTokensTo.blockHash,
      transactionHash: receiptReceiveTokensTo.transactionHash,
      logIndex: receiptReceiveTokensTo.logs[6].logIndex,
    });
    await methodCall.call({ from: userAddress });
    await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Bridge receivedTokens completed");

    logger.debug("Getting final balances");
    const {
      bridgeBalance: bridgeBalanceAfter,
      receiverBalance: receiverBalanceAfter,
      senderBalance: senderBalanceAfter,
    } = await getUsersBalances(
      originTokenContract,
      destinationTokenContract,
      originBridgeAddress,
      userAddress
    );

    const expectedBalanceBridge = BigInt(bridgeBalanceBefore) - BigInt(amount);
    checkBalance(bridgeBalanceAfter, expectedBalanceBridge);
    const expBalanceReceiver = BigInt(receiverBalanceBefore) + BigInt(amount);
    checkBalance(receiverBalanceAfter, expBalanceReceiver);
    const expectedBalanceSender = BigInt(senderBalanceBefore) - BigInt(amount);
    checkBalance(senderBalanceAfter, expectedBalanceSender);

    const crossBackCompletedBalance = await mainChainWeb3.eth.getBalance(
      userAddress
    );
    logger.debug("Final user balance", crossBackCompletedBalance);
    logger.debug(
      "Cost: ",
      BigInt(initialUserBalance) - BigInt(crossBackCompletedBalance)
    );

    const {
      anotherTokenAddress,
      anotherTokenContract,
      allowTokensAddress,
      multiSigContract,
      destinationAnotherTokenAddress,
      receiptSend,
    } = await transferCheckStartErc777({
      mainChainWeb3,
      userAddress,
      amount,
      transactionSender,
      userPrivateKey,
      configChain,
      allowTokensContract,
      federatorKeys,
      destinationBridgeContract,
      sideMultiSigContract,
      destinationTransactionSender,
      destinationLoggerName,
      originBridgeAddress,
      waitBlocks,
      originFederators,
    });

    const { destTokenContract } =
      await transferCheckErc777ReceiveTokensOtherSide({
        destinationBridgeContract,
        userAddress,
        amount,
        receiptSend,
        destinationTransactionSender,
        destinationBridgeAddress,
        userPrivateKey,
        sideChainWeb3,
        destinationAnotherTokenAddress,
        destinationLoggerName,
        mainChainWeb3,
        waitBlocks,
        destinationFederators,
        bridgeContract,
        originBridgeAddress,
        originTokenContract,
      });

    const { confirmations } = await tranferCheckAmounts({
      allowTokensContract,
      configChain,
      multiSigContract,
      allowTokensAddress,
      cowAddress,
      mainChainWeb3,
      anotherTokenContract,
      userAddress,
      amount,
      transactionSender,
      anotherTokenAddress,
      userPrivateKey,
      destTokenContract,
      destinationLoggerName,
      destinationBridgeContract,
      sideChainWeb3,
      originBridgeAddress,
      bridgeContract,
      originFederators,
      destinationTransactionSender,
      destinationBridgeAddress,
    });

    await resetConfirmationsForFutureRuns(
      allowTokensContract,
      configChain,
      multiSigContract,
      allowTokensAddress,
      cowAddress,
      mainChainWeb3,
      confirmations
    );
  } catch (err) {
    logger.error("Unhandled error:", err.stack);
    process.exit(1);
  }
}

async function getDestinationTokenAddress(
  destinationBridgeContract,
  originAddress,
  sideMultiSigContract,
  destinationTransactionSender,
  chainConfig,
  destinationLoggerName
) {
  let destinationTokenAddress = await destinationBridgeContract.methods
    .mappedTokens(originAddress)
    .call();
  if (destinationTokenAddress === utils.zeroAddress) {
    logger.info("Side Token does not exist yet, creating it");
    const data = destinationBridgeContract.methods
      .createSideToken(
        SIDE_TOKEN_TYPE_ID,
        originAddress,
        SIDE_TOKEN_DECIMALS,
        SIDE_TOKEN_SYMBOL,
        SIDE_TOKEN_NAME
      )
      .encodeABI();
    const multiSigData = sideMultiSigContract.methods
      .submitTransaction(destinationBridgeContract.options.address, 0, data)
      .encodeABI();
    await destinationTransactionSender.sendTransaction(
      chainConfig.sidechain.multiSig,
      multiSigData,
      0,
      "",
      true
    );
    destinationTokenAddress = await destinationBridgeContract.methods
      .mappedTokens(originAddress)
      .call();
    if (destinationTokenAddress === utils.zeroAddress) {
      logger.error("Failed to create side token");
      process.exit(1);
    }
  }
  logger.info(
    `${destinationLoggerName} token address`,
    destinationTokenAddress
  );
  return destinationTokenAddress;
}

async function claimTokensFromDestinationBridge(
  destinationBridgeContract,
  userAddress,
  amount,
  receipt,
  destinationTransactionSender,
  destinationBridgeAddress,
  userPrivateKey
) {
  const methodCall = destinationBridgeContract.methods.claim({
    to: userAddress,
    amount: amount,
    blockHash: receipt.blockHash,
    transactionHash: receipt.transactionHash,
    logIndex: receipt.logs[3].logIndex,
  });
  await methodCall.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    methodCall.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logger.debug("Destination Bridge claim completed");
  return methodCall;
}

async function resetConfirmationsForFutureRuns(
  allowTokensContract,
  chainConfig,
  multiSigContract,
  allowTokensAddress,
  cowAddress,
  mainChainWeb3,
  confirmations
) {
  await allowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .call({ from: chainConfig.mainchain.multiSig });
  const data = allowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .encodeABI();

  const methodCall = multiSigContract.methods.submitTransaction(
    allowTokensAddress,
    0,
    data
  );
  await methodCall.call({ from: cowAddress });
  await methodCall.send({ from: cowAddress, gas: 500000 });
  await utils.evm_mine(1, mainChainWeb3);
  confirmations = await allowTokensContract.methods.getConfirmations().call();
  logger.debug(
    `reset confirmations: ${confirmations.smallAmount}, ${confirmations.mediumAmount}, ${confirmations.largeAmount}`
  );
  return { data, methodCall, confirmations };
}
