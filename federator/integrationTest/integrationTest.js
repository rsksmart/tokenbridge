const fs = require("fs");
const Web3 = require("web3");

//configurations
// the following file should only be used for integration tests
const config = require("../config/test.local.config.js");
const abiBridge = require("../../bridge/abi/Bridge.json");
const abiMainToken = require("../../bridge/abi/MainToken.json");
const abiSideToken = require("../../bridge/abi/SideToken.json");
const abiAllowTokens = require("../../bridge/abi/AllowTokens.json");
const abiMultiSig = require("../../bridge/abi/MultiSigWallet.json");

//utils
const TransactionSender = require("../src/lib/TransactionSender");
const FederatorERC = require("../src/lib/FederatorERC");
const utils = require("../src/lib/utils");
const fundFederators = require("./fundFederators");
const MSG_TOKEN_NOT_VOTED = "Token was not voted by federators";

const destinationTokenBytecode = fs.readFileSync(
  `${__dirname}/sideTokenBytecode.txt`,
  "utf8"
);
const logs = require("../src/lib/logs");
const logWrapper = logs.Logs.getInstance().getLogger(
  logs.LOGGER_CATEGORY_TEST_INTEGRATION
);
logWrapper.info("----------- Transfer Test ---------------------");
logWrapper.info("Mainchain Host", config.mainchain.host);
logWrapper.info("Sidechain Host", config.sidechain.host);

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
  configFile.sidechain = [configFile.sidechain];
  const logWrapperFederator = logs.Logs.getInstance().getLogger(
    logs.LOGGER_CATEGORY_TEST_FEDERATOR
  );
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new FederatorERC.default(
        {
          ...configFile,
          privateKey: key,
          storagePath: `${configFile.storagePath}/${storagePathPrefix}-${
            i + 1
          }`,
        },
        logWrapperFederator
      );
      federators.push(federator);
    });
  } else {
    federators.push(
      new FederatorERC.default(
        {
          ...configFile,
          storagePath: `${config.storagePath}/${storagePathPrefix}`,
        },
        logWrapperFederator
      )
    );
  }
  configFile.sidechain = configFile.sidechain[0];
  return federators;
}

async function run(
  originFederators,
  destinationFederators,
  originConfig,
  destinationConfig
) {
  logWrapper.info("Starting transfer from Mainchain to Sidechain");
  await transfer(
    originFederators,
    destinationFederators,
    originConfig,
    MAIN_CHAIN_LOGGER_NAME,
    SIDE_CHAIN_LOGGER_NAME
  );
  logWrapper.info("Completed transfer from Mainchain to Sidechain");

  logWrapper.info("Starting transfer from Sidechain to Mainchain");
  const invertOriginFederators = destinationFederators;
  const invertDestinationFederators = originFederators;
  await transfer(
    invertOriginFederators,
    invertDestinationFederators,
    destinationConfig,
    SIDE_CHAIN_LOGGER_NAME,
    MAIN_CHAIN_LOGGER_NAME
  );
  logWrapper.info("Completed transfer from Sidechain to Mainchain");
}

async function checkAddressBalance(tokenContract, userAddress, loggerName) {
  const balance = await tokenContract.methods.balanceOf(userAddress).call();
  logWrapper.info(`${loggerName} token balance`, balance);
  if (balance.toString() === "0") {
    logWrapper.error("Token was not claimed");
    process.exit(1);
  }
}

async function checkTxDataHash(bridgeContract, receipt) {
  const txDataHash = await bridgeContract.methods
    .transactionsDataHashes(receipt.transactionHash)
    .call();
  if (txDataHash === utils.ZERO_HASH) {
    logWrapper.error(MSG_TOKEN_NOT_VOTED);
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
  destinationChainId,
  originChainId,
  originReceiptSendTransaction,
  originUserAddress,
  amount,
  destinationTransactionSender,
  destinationBridgeAddress,
  originUserPrivateKey,
  destinationLoggerName,
  destinationTokenContract,
  originChainWeb3,
}) {
  await checkTxDataHash(
    destinationBridgeContract,
    originReceiptSendTransaction
  );

  logWrapper.info("claimTokensFromDestinationBridge init");
  await claimTokensFromDestinationBridge({
    destinationBridgeContract,
    originChainId,
    originUserAddress,
    amount,
    originReceiptSendTransaction,
    destinationTransactionSender,
    destinationBridgeAddress,
    originUserPrivateKey,
  });
  logWrapper.info("claimTokensFromDestinationBridge finish");

  logWrapper.debug("Check balance on the other side");
  await checkAddressBalance(
    destinationTokenContract,
    originUserAddress,
    destinationLoggerName
  );

  const crossCompletedBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug(
    "One way cross user balance (ETH or RBTC)",
    crossCompletedBalance
  );
}

function checkBalance(currentBalance, expectedBalance) {
  if (expectedBalance !== BigInt(currentBalance)) {
    logWrapper.error(
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
  logWrapper.debug(
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
      return item.runAll();
    });
  }, Promise.resolve());
}

async function transferBackTokens({
  destinationTokenContract,
  originUserAddress,
  destinationTransactionSender,
  configChain,
  destinationBridgeAddress,
  amount,
  originTokenAddress,
  destinationTokenAddress,
  originUserPrivateKey,
  originMultiSigContract,
  destinationMultiSigContract,
  destinationAllowTokensAddress,
  federatorPrivateKeys,
  destinationBridgeContract,
  destinationChainId,
  originChainId,
  originChainWeb3,
  destinationFederators,
}) {
  await destinationTransactionSender.sendTransaction(
    originUserAddress,
    "",
    6000000,
    configChain.privateKey,
    true
  );

  logWrapper.debug("Approving token transfer on destination");
  const dataApproveAbi = destinationTokenContract.methods
    .approve(destinationBridgeAddress, amount)
    .encodeABI();
  await destinationTransactionSender.sendTransaction(
    destinationTokenAddress,
    dataApproveAbi,
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Token transfer approved");
  const allowed = await destinationTokenContract.methods
    .allowance(originUserAddress, destinationBridgeAddress)
    .call();
  logWrapper.debug("Allowed to transfer ", allowed);
  logWrapper.debug("Set side token limit");

  await sendFederatorTx(
    configChain.sidechain.multiSig,
    destinationMultiSigContract,
    destinationAllowTokensAddress,
    dataApproveAbi,
    federatorPrivateKeys,
    destinationTransactionSender
  );

  const sideTokenAddress = await destinationBridgeContract.methods
    .sideTokenByOriginalToken(originChainId, originTokenAddress)
    .call();

  logWrapper.debug("Bridge side receiveTokens");
  const destinationReceiptReceiveTokensTo = await callReceiveTokens({
    bridgeContract: destinationBridgeContract,
    chainId: originChainId,
    tokenAddress: sideTokenAddress,
    originUserAddress,
    userAmount: amount,
    bridgeAddress: destinationBridgeAddress,
    transactionSender: destinationTransactionSender,
    userPrivateKey: originUserPrivateKey,
  });
  logWrapper.debug("Bridge side receiveTokens completed");
  logWrapper.debug("Starting federator processes");
  logWrapper.debug("Fund federator wallets");

  federatorPrivateKeys =
    sideKeys && sideKeys.length ? sideKeys : [configChain.privateKey];
  await fundFederators(
    configChain.mainchain.host,
    federatorPrivateKeys,
    configChain.mainchain.privateKey,
    originChainWeb3.utils.toWei("1")
  );

  logWrapper.warn(
    "`------------- It will start the runFederators of the destinationFederators -------------`,"
  );
  await runFederators(destinationFederators);
  return destinationReceiptReceiveTokensTo;
}

async function callReceiveTokens({
  bridgeContract,
  chainId,
  tokenAddress,
  originUserAddress,
  userAmount,
  bridgeAddress,
  transactionSender,
  userPrivateKey,
}) {
  const methodCallReceiveTokensTo = bridgeContract.methods.receiveTokensTo(
    chainId,
    tokenAddress,
    originUserAddress,
    userAmount
  );
  const receipt = await methodCallReceiveTokensTo.call({
    from: originUserAddress,
  });
  logWrapper.warn("callReceiveTokens call receipt", receipt);
  return transactionSender.sendTransaction(
    bridgeAddress,
    methodCallReceiveTokensTo.encodeABI(),
    0,
    userPrivateKey,
    true
  );
}

async function callAllReceiveTokens({
  userSmallAmount,
  userMediumAmount,
  userLargeAmount,
  destinationChainId,
  originChainId,
  originBridgeContract,
  originAnotherTokenAddress,
  originUserAddress,
  originBridgeAddress,
  originTransactionSender,
  originUserPrivateKey,
}) {
  logWrapper.warn("callAllReceiveTokens callReceiveTokens small amount init");
  // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
  const smallAmountReceipt = await callReceiveTokens({
    bridgeContract: originBridgeContract,
    chainId: destinationChainId,
    tokenAddress: originAnotherTokenAddress,
    originUserAddress,
    userAmount: userSmallAmount,
    bridgeAddress: originBridgeAddress,
    transactionSender: originTransactionSender,
    userPrivateKey: originUserPrivateKey,
  });
  logWrapper.warn("callAllReceiveTokens callReceiveTokens small amount finish");

  // Cross AnotherToken (type id 0) Medium Amount >= toWei('0.01') && < toWei('0.1')
  const mediumAmountReceipt = await callReceiveTokens({
    bridgeContract: originBridgeContract,
    chainId: destinationChainId,
    tokenAddress: originAnotherTokenAddress,
    originUserAddress,
    userAmount: userMediumAmount,
    bridgeAddress: originBridgeAddress,
    transactionSender: originTransactionSender,
    userPrivateKey: originUserPrivateKey,
  });

  // Cross AnotherToken (type id 0) Large Amount >= toWei('0.1')
  const largeAmountReceipt = await callReceiveTokens({
    bridgeContract: originBridgeContract,
    chainId: destinationChainId,
    tokenAddress: originAnotherTokenAddress,
    originUserAddress,
    userAmount: userLargeAmount,
    bridgeAddress: originBridgeAddress,
    transactionSender: originTransactionSender,
    userPrivateKey: originUserPrivateKey,
  });

  return {
    smallAmountReceipt,
    mediumAmountReceipt,
    largeAmountReceipt,
  };
}

async function tranferCheckAmountsGetDestinationBalance({
  originAllowTokensContract,
  configChain,
  originMultiSigContract,
  originAllowTokensAddress,
  cowAddress,
  originChainWeb3,
  originAnotherTokenContract,
  originUserAddress,
  amount,
  originTransactionSender,
  originAnotherTokenAddress,
  originUserPrivateKey,
  destinationTokenContract,
  destinationLoggerName,
  destinationBridgeContract,
  destinationChainId,
  originChainId,
  destinationChainWeb3,
}) {
  logWrapper.info(
    "------------- SMALL, MEDIUM and LARGE amounts are processed after required confirmations  -----------------"
  );

  await originAllowTokensContract.methods
    .setConfirmations("100", "1000", "2000")
    .call({ from: configChain.mainchain.multiSig });
  const dataTransferSetConfirmations = originAllowTokensContract.methods
    .setConfirmations("100", "1000", "2000")
    .encodeABI();

  const methodCallSetConfirmations =
    originMultiSigContract.methods.submitTransaction(
      originAllowTokensAddress,
      0,
      dataTransferSetConfirmations
    );
  await methodCallSetConfirmations.call({ from: cowAddress });
  await methodCallSetConfirmations.send({ from: cowAddress, gas: 500000 });

  await utils.evm_mine(1, originChainWeb3);
  const confirmations = await originAllowTokensContract.methods
    .getConfirmations()
    .call();

  const dataMintAbi = originAnotherTokenContract.methods
    .mint(originUserAddress, amount, "0x", "0x")
    .encodeABI();
  await originTransactionSender.sendTransaction(
    originAnotherTokenAddress,
    dataMintAbi,
    0,
    originUserPrivateKey,
    true
  );
  const remainingUserBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug(
    "user native token balance before crossing tokens:",
    remainingUserBalance
  );

  const userBalanceAnotherToken = await originAnotherTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.debug(
    "user balance before crossing tokens:",
    userBalanceAnotherToken
  );
  let balance = await destinationTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.info(
    `${destinationLoggerName} token balance before crossing`,
    balance
  );

  const anotherTokenOriginalAddr = await destinationBridgeContract.methods
    .sideTokenByOriginalToken(originChainId, originAnotherTokenAddress)
    .call();
  logWrapper.info(
    `${destinationLoggerName} token address`,
    anotherTokenOriginalAddr
  );
  if (anotherTokenOriginalAddr === utils.ZERO_ADDRESS) {
    logWrapper.error(MSG_TOKEN_NOT_VOTED);
    process.exit(1);
  }

  logWrapper.debug("Check balance on the other side before crossing");
  const destinationSideTokenContract = new destinationChainWeb3.eth.Contract(
    abiSideToken,
    anotherTokenOriginalAddr
  );
  balance = await destinationSideTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.info(`${destinationLoggerName} token balance`, balance);

  return {
    confirmations,
    destinationSideTokenContract,
    balance,
  };
}

async function tranferCheckAmounts({
  originAllowTokensContract,
  configChain,
  originMultiSigContract,
  originAllowTokensAddress,
  cowAddress,
  originChainWeb3,
  originAnotherTokenContract,
  originUserAddress,
  amount,
  originTransactionSender,
  originAnotherTokenAddress,
  originUserPrivateKey,
  destinationTokenContract,
  destinationLoggerName,
  destinationBridgeContract,
  destinationChainId,
  destinationChainWeb3,
  originBridgeAddress,
  originBridgeContract,
  originChainId,
  originFederators,
  destinationTransactionSender,
  destinationBridgeAddress,
}) {
  const {
    confirmations,
    destinationSideTokenContract,
    balance: destinationInitialUserBalance,
  } = await tranferCheckAmountsGetDestinationBalance({
    originAllowTokensContract,
    configChain,
    originMultiSigContract,
    originAllowTokensAddress,
    cowAddress,
    originChainWeb3,
    originAnotherTokenContract,
    originUserAddress,
    amount,
    originTransactionSender,
    originAnotherTokenAddress,
    originUserPrivateKey,
    destinationTokenContract,
    destinationLoggerName,
    destinationBridgeContract,
    destinationChainId,
    originChainId,
    destinationChainWeb3,
  });

  // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
  const userSmallAmount = originChainWeb3.utils.toWei("0.0056");
  const userMediumAmount = originChainWeb3.utils.toWei("0.019"); // < toWei('0.1')
  const userLargeAmount = originChainWeb3.utils.toWei("1.32");
  const userAppoveTotalAmount = originChainWeb3.utils.toWei("10");

  logWrapper.debug(
    "Send small amount, medium amount and large amount transactions"
  );
  const methodCallApprove = originAnotherTokenContract.methods.approve(
    originBridgeAddress,
    userAppoveTotalAmount
  );
  await methodCallApprove.call({ from: originUserAddress });
  await originTransactionSender.sendTransaction(
    originAnotherTokenAddress,
    methodCallApprove.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );

  logWrapper.debug("tranferCheckAmounts callAllReceiveTokens init");
  // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
  const { smallAmountReceipt, mediumAmountReceipt, largeAmountReceipt } =
    await callAllReceiveTokens({
      userSmallAmount,
      userMediumAmount,
      userLargeAmount,
      destinationChainId,
      originChainId,
      originBridgeContract,
      originAnotherTokenAddress,
      originUserAddress,
      originBridgeAddress,
      originTransactionSender,
      originUserPrivateKey,
    });
  logWrapper.debug("tranferCheckAmounts callAllReceiveTokens finish");

  logWrapper.debug("Mine small amount confirmations blocks");
  const delta_1 = parseInt(confirmations.smallAmount);
  await utils.evm_mine(delta_1, originChainWeb3);

  await runFederators(originFederators);
  logWrapper.debug("Claim small amounts");
  const methodCallClaim = destinationBridgeContract.methods.claim({
    to: originUserAddress,
    amount: userSmallAmount,
    blockHash: smallAmountReceipt.blockHash,
    transactionHash: smallAmountReceipt.transactionHash,
    logIndex: smallAmountReceipt.logs[4].logIndex,
    originChainId: originChainId,
  });
  await methodCallClaim.call({ from: originUserAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    methodCallClaim.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Small amount claim completed");

  // check small amount txn went through
  let balance = await destinationSideTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.info(
    `DESTINATION ${destinationLoggerName} token balance after ${delta_1} confirmations`,
    balance
  );

  const expectedBalanceUser =
    BigInt(destinationInitialUserBalance) + BigInt(userSmallAmount);
  if (expectedBalanceUser !== BigInt(balance)) {
    logWrapper.error(
      `userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceUser} but got ${balance}`
    );
    process.exit(1);
  }

  logWrapper.debug("Mine medium amount confirmations blocks");
  const delta_2 = parseInt(confirmations.mediumAmount) - delta_1;
  await utils.evm_mine(delta_2, originChainWeb3);

  await runFederators(originFederators);
  logWrapper.debug("Claim medium amounts");
  const callerClaim = destinationBridgeContract.methods.claim({
    to: originUserAddress,
    amount: userMediumAmount,
    blockHash: mediumAmountReceipt.blockHash,
    transactionHash: mediumAmountReceipt.transactionHash,
    logIndex: mediumAmountReceipt.logs[4].logIndex,
    originChainId: originChainId,
  });
  await callerClaim.call({ from: originUserAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    callerClaim.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Medium amount claim completed");

  // check medium amount txn went through
  balance = await destinationSideTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.info(
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
    logWrapper.error(
      `userMediumAmount + userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceUsers} but got ${balance}`
    );
    process.exit(1);
  }

  logWrapper.debug("Mine large amount confirmations blocks");
  const delta_3 = parseInt(confirmations.largeAmount) - delta_2;
  await utils.evm_mine(delta_3, originChainWeb3);

  await runFederators(originFederators);
  const numberOfConfirmations = delta_1 + delta_2 + delta_3;
  await claimLargeAmounts({
    destinationBridgeContract,
    destinationChainId,
    originChainId,
    userAddress: originUserAddress,
    userLargeAmount,
    userMediumAmount,
    userSmallAmount,
    largeAmountReceipt,
    destinationTransactionSender,
    destinationBridgeAddress,
    userPrivateKey: originUserPrivateKey,
    destinationSideTokenContract,
    destinationLoggerName,
    numberOfConfirmations,
    destinationInitialUserBalance,
    anotherTokenContract: originAnotherTokenContract,
  });

  return { confirmations };
}

async function claimLargeAmounts({
  destinationBridgeContract,
  destinationChainId,
  originChainId,
  userAddress,
  userLargeAmount,
  userMediumAmount,
  userSmallAmount,
  largeAmountReceipt,
  destinationTransactionSender,
  destinationBridgeAddress,
  userPrivateKey,
  destinationSideTokenContract,
  destinationLoggerName,
  numberOfConfirmations,
  destinationInitialUserBalance,
  anotherTokenContract,
}) {
  logWrapper.debug("Claim large amounts");
  const destinationCallerClaim = destinationBridgeContract.methods.claim({
    to: userAddress,
    amount: userLargeAmount,
    blockHash: largeAmountReceipt.blockHash,
    transactionHash: largeAmountReceipt.transactionHash,
    logIndex: largeAmountReceipt.logs[4].logIndex,
    originChainId: originChainId,
  });
  await destinationCallerClaim.call({ from: userAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    destinationCallerClaim.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logWrapper.debug("Large amount claim completed");

  // check large amount txn went through
  const destinationBalance = await destinationSideTokenContract.methods
    .balanceOf(userAddress)
    .call();
  logWrapper.info(
    `DESTINATION ${destinationLoggerName} token balance after ${numberOfConfirmations} confirmations`,
    destinationBalance
  );

  const expectedBalanceAll =
    BigInt(destinationInitialUserBalance) +
    BigInt(userLargeAmount) +
    BigInt(userMediumAmount) +
    BigInt(userSmallAmount);
  if (expectedBalanceAll !== BigInt(destinationBalance)) {
    logWrapper.error(
      `Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalanceAll} but got ${destinationBalance}`
    );
    process.exit(1);
  }

  logWrapper.debug(
    "ORIGIN user balance after crossing:",
    await anotherTokenContract.methods.balanceOf(userAddress).call()
  );
}

async function transferCheckErc777ReceiveTokensOtherSide({
  destinationBridgeContract,
  originUserAddress,
  amount,
  originReceiptSend,
  destinationTransactionSender,
  destinationBridgeAddress,
  originUserPrivateKey,
  destinationChainWeb3,
  destinationAnotherTokenAddress,
  destinationLoggerName,
  originChainWeb3,
  originWaitBlocks,
  destinationFederators,
  originBridgeContract,
  originChainId,
  destinationChainId,
  originBridgeAddress,
  originTokenContract,
  tokenContract,
}) {
  logWrapper.info(
    "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
  );

  await claimTokensFromDestinationBridge({
    destinationBridgeContract,
    originUserAddress,
    amount,
    originReceiptSendTransaction: originReceiptSend,
    destinationTransactionSender,
    destinationBridgeAddress,
    originUserPrivateKey,
    originChainId,
  });

  const destTokenContract = new destinationChainWeb3.eth.Contract(
    abiSideToken,
    destinationAnotherTokenAddress
  );
  logWrapper.debug("Check balance on the other side");
  await checkAddressBalance(
    destTokenContract,
    originUserAddress,
    destinationLoggerName
  );

  const crossUsrBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug("One way cross user balance", crossUsrBalance);

  logWrapper.info(
    "------------- CONTRACT ERC777 TEST TRANSFER BACK THE TOKENS -----------------"
  );
  const senderBalanceBeforeErc777 = await destTokenContract.methods
    .balanceOf(originUserAddress)
    .call();

  const methodSendCall = destTokenContract.methods.send(
    destinationBridgeAddress,
    amount,
    originChainWeb3.eth.abi.encodeParameters(["uint256"], [originChainId])
  );
  methodSendCall.call({ from: originUserAddress });
  const receiptSendTx = await destinationTransactionSender.sendTransaction(
    destinationAnotherTokenAddress,
    methodSendCall.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );

  logWrapper.debug(`Wait for ${originWaitBlocks} blocks`);
  await utils.waitBlocks(destinationChainWeb3, originWaitBlocks);

  logWrapper.warn(
    `------------- It will start the runFederators of the destinationFederators -------------`,
    destinationFederators
  );
  await runFederators(destinationFederators);
  await checkTxDataHash(originBridgeContract, receiptSendTx);

  logWrapper.info(
    "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
  );
  const methodCallClaim = originBridgeContract.methods.claim({
    to: originUserAddress,
    amount: amount,
    blockHash: receiptSendTx.blockHash,
    transactionHash: receiptSendTx.transactionHash,
    logIndex: receiptSendTx.logs[5].logIndex,
    originChainId: destinationChainId,
  });
  await methodCallClaim.call({ from: originUserAddress });
  await destinationTransactionSender.sendTransaction(
    originBridgeAddress,
    methodCallClaim.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Destination Bridge claim completed");
  logWrapper.debug("Getting final balances");

  const { senderBalance: senderBalanceAfterErc777 } = await getUsersBalances(
    originTokenContract,
    destTokenContract,
    originBridgeAddress,
    originUserAddress
  );

  if (senderBalanceBeforeErc777 === BigInt(senderBalanceAfterErc777)) {
    logWrapper.error(
      `Wrong Sender balance. Expected Sender balance to change but got ${senderBalanceAfterErc777}`
    );
    process.exit(1);
  }

  const crossBackCompletedBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug("Final user balance", crossBackCompletedBalance);
}

async function transferCheckStartErc777({
  originChainWeb3,
  userAddress,
  amount,
  originTransactionSender,
  userPrivateKey,
  configChain,
  originAllowTokensContract,
  federatorKeys,
  destinationBridgeContract,
  destinationChainId,
  originChainId,
  destinationMultiSigContract,
  originMultiSigContract,
  destinationTransactionSender,
  destinationLoggerName,
  originBridgeAddress,
  waitBlocks,
  originFederators,
}) {
  logWrapper.info(
    "------------- START CONTRACT ERC777 TEST TOKEN SEND TEST -----------------"
  );
  const originAnotherToken = new originChainWeb3.eth.Contract(abiSideToken);
  const knownAccount = (await originChainWeb3.eth.getAccounts())[0];

  logWrapper.debug("Deploying another token contract");
  const originAnotherTokenContract = await originAnotherToken
    .deploy({
      data: destinationTokenBytecode,
      arguments: ["MAIN", "MAIN", userAddress, "1"],
    })
    .send({
      from: knownAccount,
      gas: 6700000,
      gasPrice: 20000000000,
    });
  logWrapper.debug("Token deployed");
  logWrapper.debug("Minting new token");
  const originAnotherTokenAddress = originAnotherTokenContract.options.address;
  const dataMintAbi = originAnotherTokenContract.methods
    .mint(userAddress, amount, "0x", "0x")
    .encodeABI();
  await originTransactionSender.sendTransaction(
    originAnotherTokenAddress,
    dataMintAbi,
    0,
    userPrivateKey,
    true
  );

  logWrapper.debug("Adding new token to list of allowed on bridge");
  const originAllowTokensAddress = originAllowTokensContract.options.address;
  const originSetTokenEncodedAbi = originAllowTokensContract.methods
    .setToken(originAnotherTokenAddress, SIDE_TOKEN_TYPE_ID)
    .encodeABI();

  await sendFederatorTx(
    configChain.mainchain.multiSig,
    originMultiSigContract,
    originAllowTokensAddress,
    originSetTokenEncodedAbi,
    federatorKeys,
    originTransactionSender
  );

  const destinationAnotherTokenAddress = await getDestinationTokenAddress(
    destinationBridgeContract,
    originChainId,
    originAnotherTokenAddress,
    destinationMultiSigContract,
    destinationTransactionSender,
    configChain,
    destinationLoggerName
  );

  const methodCallSend = originAnotherTokenContract.methods.send(
    originBridgeAddress,
    amount,
    originChainWeb3.eth.abi.encodeParameters(
      ["address", "uint256"],
      [userAddress, destinationChainId]
    )
  );
  logWrapper.warn("Calling bridge tokensReceived");
  const receipt = await methodCallSend.call({ from: userAddress });
  logWrapper.debug("bridge tokensReceived receipt:", receipt);

  const originReceiptSend = await originTransactionSender.sendTransaction(
    originAnotherTokenAddress,
    methodCallSend.encodeABI(),
    0,
    userPrivateKey,
    true
  );
  logWrapper.debug("Call to transferAndCall completed");

  logWrapper.debug(`Wait for ${waitBlocks} blocks`);
  await utils.waitBlocks(originChainWeb3, waitBlocks);

  await runFederators(originFederators);

  return {
    originAnotherTokenAddress,
    originAnotherTokenContract,
    originAllowTokensAddress,
    destinationAnotherTokenAddress,
    originReceiptSend,
  };
}

async function transferCheckSendingTokens({
  originChainWeb3,
  originTransactionSender,
  configChain,
  destinationTransactionSender,
  originLoggerName,
  originAddress,
  originTokenContract,
  amount,
  cowAddress,
  originBridgeAddress,
  originAllowTokensContract,
  destinationChainWeb3,
  destinationChainId,
  originChainId,
}) {
  logWrapper.info("------------- SENDING THE TOKENS -----------------");
  logWrapper.debug("Getting address from pk");
  const originUserPrivateKey = originChainWeb3.eth.accounts.create().privateKey;
  const originUserAddress = await originTransactionSender.getAddress(
    originUserPrivateKey
  );
  await originTransactionSender.sendTransaction(
    originUserAddress,
    "",
    originChainWeb3.utils.toWei("1"),
    configChain.privateKey
  );
  await destinationTransactionSender.sendTransaction(
    originUserAddress,
    "",
    originChainWeb3.utils.toWei("1"),
    configChain.privateKey,
    true
  );
  logWrapper.info(
    `${originLoggerName} token address ${originAddress} - User Address: ${originUserAddress}`
  );

  const originInitialUserBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug("Initial user balance ", originInitialUserBalance);
  await originTokenContract.methods
    .transfer(originUserAddress, amount)
    .send({ from: cowAddress });
  const initialTokenBalance = await originTokenContract.methods
    .balanceOf(originUserAddress)
    .call();
  logWrapper.debug("Initial token balance ", initialTokenBalance);

  logWrapper.debug("Approving token transfer");
  await originTokenContract.methods
    .transfer(originUserAddress, amount)
    .call({ from: originUserAddress });
  const methodTransferData = originTokenContract.methods
    .transfer(originUserAddress, amount)
    .encodeABI();
  await originTransactionSender.sendTransaction(
    originAddress,
    methodTransferData,
    0,
    configChain.privateKey,
    true
  );
  await originTokenContract.methods
    .approve(originBridgeAddress, amount)
    .call({ from: originUserAddress });

  const methodApproveData = originTokenContract.methods
    .approve(originBridgeAddress, amount)
    .encodeABI();
  await originTransactionSender.sendTransaction(
    originAddress,
    methodApproveData,
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Token transfer approved");

  logWrapper.debug("Bridge receiveTokens (transferFrom)");
  const originBridgeContract = new originChainWeb3.eth.Contract(
    abiBridge,
    originBridgeAddress
  );
  logWrapper.debug("Bridge addr", originBridgeAddress);
  logWrapper.debug(
    "allowTokens addr",
    originAllowTokensContract.options.address
  );
  logWrapper.debug(
    "Bridge AllowTokensAddr",
    await originBridgeContract.methods.allowTokens().call()
  );
  logWrapper.debug(
    "allowTokens primary",
    await originAllowTokensContract.methods.primary().call()
  );
  logWrapper.debug(
    "allowTokens owner",
    await originAllowTokensContract.methods.owner().call()
  );
  logWrapper.debug("accounts:", await originChainWeb3.eth.getAccounts());
  const originMethodCallReceiveTokensTo =
    originBridgeContract.methods.receiveTokensTo(
      destinationChainId,
      originAddress,
      originUserAddress,
      amount
    );
  await originMethodCallReceiveTokensTo.call({ from: originUserAddress });
  const originReceiptSendTransaction =
    await originTransactionSender.sendTransaction(
      originBridgeAddress,
      originMethodCallReceiveTokensTo.encodeABI(),
      0,
      originUserPrivateKey,
      true
    );
  logWrapper.debug("Bridge receivedTokens completed");

  const originWaitBlocks = configChain.confirmations || 0;
  logWrapper.debug(`Wait for ${originWaitBlocks} blocks`);
  await utils.waitBlocks(originChainWeb3, originWaitBlocks);

  logWrapper.debug("Starting federator processes");

  // Start origin federators with delay between them
  logWrapper.debug("Fund federator wallets");
  const federatorPrivateKeys =
    mainKeys && mainKeys.length ? mainKeys : [configChain.privateKey];
  await fundFederators(
    configChain.sidechain.host,
    federatorPrivateKeys,
    configChain.sidechain.privateKey,
    destinationChainWeb3.utils.toWei("1")
  );

  return {
    originReceiptSendTransaction,
    originUserAddress,
    originUserPrivateKey,
    federatorPrivateKeys,
    originBridgeContract,
    originInitialUserBalance,
    originWaitBlocks,
  };
}

async function transferChecks({
  originChainWeb3,
  originTransactionSender,
  configChain,
  destinationTransactionSender,
  originLoggerName,
  originAddress: originTokenAddress,
  originTokenContract,
  amount,
  cowAddress,
  originBridgeAddress,
  originAllowTokensContract,
  destinationChainWeb3,
  originFederators,
  destinationTokenAddress,
  destinationBridgeContract,
  destinationChainId,
  originChainId,
  destinationBridgeAddress,
  destinationLoggerName,
  originMultiSigContract,
  destinationMultiSigContract,
  destinationAllowTokensAddress,
  destinationFederators,
}) {
  const {
    originReceiptSendTransaction,
    originUserAddress,
    originUserPrivateKey,
    federatorPrivateKeys,
    originBridgeContract,
    originInitialUserBalance,
    originWaitBlocks,
  } = await transferCheckSendingTokens({
    originChainWeb3,
    originTransactionSender,
    configChain,
    destinationTransactionSender,
    originLoggerName,
    originAddress: originTokenAddress,
    originTokenContract,
    amount,
    cowAddress,
    originBridgeAddress,
    originAllowTokensContract,
    destinationChainWeb3,
    destinationChainId,
    originChainId,
  });
  await runFederators(originFederators);
  logWrapper.info(
    "------------- RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
  );

  const destinationTokenContract = new destinationChainWeb3.eth.Contract(
    abiSideToken,
    destinationTokenAddress
  );

  logWrapper.info("transferReceiveTokensOtherSide init");
  await transferReceiveTokensOtherSide({
    destinationBridgeContract,
    destinationChainId,
    originChainId,
    originReceiptSendTransaction,
    originUserAddress,
    amount,
    destinationTransactionSender,
    destinationBridgeAddress,
    originUserPrivateKey,
    destinationLoggerName,
    destinationTokenContract,
    originChainWeb3,
  });
  logWrapper.info("transferReceiveTokensOtherSide finish");

  logWrapper.info("------------- TRANSFER BACK THE TOKENS -----------------");
  logWrapper.debug("Getting initial balances before transfer");
  const {
    bridgeBalance: bridgeBalanceBefore,
    receiverBalance: receiverBalanceBefore,
    senderBalance: senderBalanceBefore,
  } = await getUsersBalances(
    originTokenContract,
    destinationTokenContract,
    originBridgeAddress,
    originUserAddress
  );

  const destinationReceiptReceiveTokensTo = await transferBackTokens({
    destinationTokenContract,
    originUserAddress,
    destinationTransactionSender,
    configChain,
    destinationBridgeAddress,
    amount,
    originTokenAddress,
    destinationTokenAddress,
    originUserPrivateKey,
    originMultiSigContract,
    destinationMultiSigContract,
    destinationAllowTokensAddress,
    federatorPrivateKeys,
    destinationBridgeContract,
    destinationChainId,
    originChainId,
    originChainWeb3,
    destinationFederators,
  });

  logWrapper.info(
    "------------- RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
  );
  logWrapper.debug("Check balance on the starting side");
  const methodCallClaim = originBridgeContract.methods.claim({
    to: originUserAddress,
    amount: amount,
    blockHash: destinationReceiptReceiveTokensTo.blockHash,
    transactionHash: destinationReceiptReceiveTokensTo.transactionHash,
    logIndex: destinationReceiptReceiveTokensTo.logs[6].logIndex,
    originChainId: destinationChainId,
  });
  await methodCallClaim.call({ from: originUserAddress });
  await originTransactionSender.sendTransaction(
    originBridgeAddress,
    methodCallClaim.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Bridge receivedTokens completed");

  logWrapper.debug("Getting final balances");
  const {
    bridgeBalance: bridgeBalanceAfter,
    receiverBalance: receiverBalanceAfter,
    senderBalance: senderBalanceAfter,
  } = await getUsersBalances(
    originTokenContract,
    destinationTokenContract,
    originBridgeAddress,
    originUserAddress
  );

  const expectedBalanceBridge = BigInt(bridgeBalanceBefore) - BigInt(amount);
  checkBalance(bridgeBalanceAfter, expectedBalanceBridge);
  const expBalanceReceiver = BigInt(receiverBalanceBefore) + BigInt(amount);
  checkBalance(receiverBalanceAfter, expBalanceReceiver);
  const expectedBalanceSender = BigInt(senderBalanceBefore) - BigInt(amount);
  checkBalance(senderBalanceAfter, expectedBalanceSender);

  const crossBackCompletedBalance = await originChainWeb3.eth.getBalance(
    originUserAddress
  );
  logWrapper.debug("Final user balance", crossBackCompletedBalance);
  logWrapper.debug(
    "Cost: ",
    BigInt(originInitialUserBalance) - BigInt(crossBackCompletedBalance)
  );

  const {
    originAnotherTokenAddress,
    originAnotherTokenContract,
    originAllowTokensAddress,
    destinationAnotherTokenAddress,
    originReceiptSend,
  } = await transferCheckStartErc777({
    originChainWeb3,
    userAddress: originUserAddress,
    amount,
    originTransactionSender,
    userPrivateKey: originUserPrivateKey,
    configChain,
    originAllowTokensContract,
    federatorKeys: federatorPrivateKeys,
    destinationBridgeContract,
    destinationChainId,
    originChainId,
    destinationMultiSigContract,
    originMultiSigContract,
    destinationTransactionSender,
    destinationLoggerName,
    originBridgeAddress,
    waitBlocks: originWaitBlocks,
    originFederators,
  });

  await transferCheckErc777ReceiveTokensOtherSide({
    destinationBridgeContract,
    originUserAddress,
    amount,
    originReceiptSend,
    destinationTransactionSender,
    destinationBridgeAddress,
    originUserPrivateKey,
    destinationChainWeb3,
    destinationAnotherTokenAddress,
    destinationLoggerName,
    originChainWeb3,
    originWaitBlocks,
    destinationFederators,
    originBridgeContract,
    originChainId,
    destinationChainId,
    originBridgeAddress,
    originTokenContract,
    tokenContract: originTokenContract,
  });

  return {
    originAllowTokensAddress,
    destinationTokenContract,
    originUserAddress,
    originUserPrivateKey,
    originAnotherTokenContract,
    originAnotherTokenAddress,
    originBridgeContract,
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
    const originChainWeb3 = new Web3(configChain.mainchain.host);
    const originChainId = await originChainWeb3.eth.net.getId();
    const destinationChainWeb3 = new Web3(configChain.sidechain.host);
    const destinationChainId = await destinationChainWeb3.eth.net.getId();
    // Increase time in one day to reset all the Daily limits from AllowTokens
    await utils.increaseTimestamp(originChainWeb3, ONE_DAY_IN_SECONDS + 1);
    await utils.increaseTimestamp(destinationChainWeb3, ONE_DAY_IN_SECONDS + 1);

    const originTokenContract = new originChainWeb3.eth.Contract(
      abiMainToken,
      configChain.mainchain.testToken
    );
    const originTransactionSender = new TransactionSender.default(
      originChainWeb3,
      logWrapper,
      configChain
    );
    const destinationTransactionSender = new TransactionSender.default(
      destinationChainWeb3,
      logWrapper,
      configChain
    );
    const originBridgeAddress = configChain.mainchain.bridge;
    const originAmount10Wei = originChainWeb3.utils.toWei("10");
    const originAddress = originTokenContract.options.address;
    const cowAddress = (await originChainWeb3.eth.getAccounts())[0];
    const originAllowTokensContract = new originChainWeb3.eth.Contract(
      abiAllowTokens,
      configChain.mainchain.allowTokens
    );
    const originMultiSigContract = new originChainWeb3.eth.Contract(
      abiMultiSig,
      configChain.mainchain.multiSig
    );
    const destinationMultiSigContract = new destinationChainWeb3.eth.Contract(
      abiMultiSig,
      configChain.sidechain.multiSig
    );
    const destinationAllowTokensAddress = configChain.sidechain.allowTokens;
    const destinationBridgeAddress = configChain.sidechain.bridge;
    logWrapper.debug(
      `${destinationLoggerName} bridge address`,
      destinationBridgeAddress
    );
    const destinationBridgeContract = new destinationChainWeb3.eth.Contract(
      abiBridge,
      destinationBridgeAddress
    );

    logWrapper.debug("Get the destination token address");
    const destinationTokenAddress = await getDestinationTokenAddress(
      destinationBridgeContract,
      originChainId,
      originAddress,
      destinationMultiSigContract,
      destinationTransactionSender,
      configChain,
      destinationLoggerName
    );

    const {
      originAllowTokensAddress,
      destinationTokenContract,
      originUserAddress,
      originUserPrivateKey,
      originAnotherTokenContract,
      originAnotherTokenAddress,
      originBridgeContract,
    } = await transferChecks({
      originChainWeb3,
      originTransactionSender,
      configChain,
      destinationTransactionSender,
      originLoggerName,
      originAddress,
      originTokenContract,
      amount: originAmount10Wei,
      cowAddress,
      originBridgeAddress,
      originAllowTokensContract,
      destinationChainWeb3,
      originFederators,
      destinationTokenAddress,
      destinationBridgeContract,
      destinationChainId,
      originChainId,
      destinationBridgeAddress,
      destinationLoggerName,
      originMultiSigContract,
      destinationMultiSigContract,
      destinationAllowTokensAddress,
      destinationFederators,
    });

    logWrapper.debug("transfer tranferCheckAmounts init");
    const { confirmations } = await tranferCheckAmounts({
      originAllowTokensContract,
      configChain,
      originMultiSigContract,
      originAllowTokensAddress,
      cowAddress,
      originChainWeb3,
      originAnotherTokenContract,
      originUserAddress,
      amount: originAmount10Wei,
      originTransactionSender,
      originAnotherTokenAddress,
      originUserPrivateKey,
      destinationTokenContract,
      destinationLoggerName,
      destinationBridgeContract,
      destinationChainId,
      destinationChainWeb3,
      originBridgeAddress,
      originBridgeContract,
      originChainId,
      originFederators,
      destinationTransactionSender,
      destinationBridgeAddress,
    });
    logWrapper.debug("transfer tranferCheckAmounts finish");

    await resetConfirmationsForFutureRuns(
      originAllowTokensContract,
      configChain,
      originMultiSigContract,
      originAllowTokensAddress,
      cowAddress,
      originChainWeb3,
      confirmations
    );
  } catch (err) {
    logWrapper.error("Unhandled error:", err.stack);
    process.exit(1);
  }
}

async function getDestinationTokenAddress(
  destinationBridgeContract,
  originChainId,
  originAddressMainToken,
  destinationMultiSigContract,
  destinationTransactionSender,
  chainConfig,
  destinationLoggerName
) {
  let destinationTokenAddress = await destinationBridgeContract.methods
    .sideTokenByOriginalToken(originChainId, originAddressMainToken)
    .call();

  logWrapper.warn(
    `destinationTokenAddress: ${destinationTokenAddress}\nchainIdMain: ${originChainId}\noriginAddressMain: ${originAddressMainToken}`
  );
  if (destinationTokenAddress === utils.ZERO_ADDRESS) {
    logWrapper.info("Side Token does not exist yet, creating it");
    const data = destinationBridgeContract.methods
      .createSideToken(
        SIDE_TOKEN_TYPE_ID,
        originAddressMainToken,
        SIDE_TOKEN_DECIMALS,
        SIDE_TOKEN_SYMBOL,
        SIDE_TOKEN_NAME,
        originChainId
      )
      .encodeABI();
    const destinationMultiSigData = destinationMultiSigContract.methods
      .submitTransaction(destinationBridgeContract.options.address, 0, data)
      .encodeABI();
    await destinationTransactionSender.sendTransaction(
      chainConfig.sidechain.multiSig,
      destinationMultiSigData,
      0,
      "",
      true
    );
    destinationTokenAddress = await destinationBridgeContract.methods
      .sideTokenByOriginalToken(originChainId, originAddressMainToken)
      .call();
    if (destinationTokenAddress === utils.ZERO_ADDRESS) {
      logWrapper.error("Failed to create side token");
      process.exit(1);
    }
  }
  logWrapper.info(
    `${destinationLoggerName} token address`,
    destinationTokenAddress
  );
  return destinationTokenAddress;
}

async function claimTokensFromDestinationBridge({
  destinationBridgeContract,
  originChainId,
  originUserAddress,
  amount,
  originReceiptSendTransaction,
  destinationTransactionSender,
  destinationBridgeAddress,
  originUserPrivateKey,
}) {
  console.log(
    "claimTokensFromDestinationBridge originUserAddress",
    originUserAddress
  );
  console.log("claimTokensFromDestinationBridge amount", amount);
  console.log(
    "claimTokensFromDestinationBridge blockHash",
    originReceiptSendTransaction.blockHash
  );
  console.log(
    "claimTokensFromDestinationBridge transactionHash",
    originReceiptSendTransaction.transactionHash
  );
  console.log(
    "claimTokensFromDestinationBridge logIndex",
    originReceiptSendTransaction.logs[3].logIndex
  );
  console.log("claimTokensFromDestinationBridge originChainId", originChainId);
  const destinationMethodCallClaim = destinationBridgeContract.methods.claim({
    to: originUserAddress,
    amount: amount,
    blockHash: originReceiptSendTransaction.blockHash,
    transactionHash: originReceiptSendTransaction.transactionHash,
    logIndex: originReceiptSendTransaction.logs[3].logIndex,
    originChainId: originChainId,
  });
  await destinationMethodCallClaim.call({ from: originUserAddress });
  await destinationTransactionSender.sendTransaction(
    destinationBridgeAddress,
    destinationMethodCallClaim.encodeABI(),
    0,
    originUserPrivateKey,
    true
  );
  logWrapper.debug("Destination Bridge claim completed");
  return destinationMethodCallClaim;
}

async function resetConfirmationsForFutureRuns(
  originAllowTokensContract,
  chainConfig,
  originMultiSigContract,
  allowTokensAddress,
  cowAddress,
  originChainWeb3,
  confirmations
) {
  await originAllowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .call({ from: chainConfig.mainchain.multiSig });
  const data = originAllowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .encodeABI();

  const methodCall = originMultiSigContract.methods.submitTransaction(
    allowTokensAddress,
    0,
    data
  );
  await methodCall.call({ from: cowAddress });
  await methodCall.send({ from: cowAddress, gas: 500000 });
  await utils.evm_mine(1, originChainWeb3);
  const allowTokensConfirmations = await originAllowTokensContract.methods
    .getConfirmations()
    .call();
  logWrapper.debug(
    `reset confirmations: ${allowTokensConfirmations.smallAmount}, ${allowTokensConfirmations.mediumAmount}, ${allowTokensConfirmations.largeAmount}`
  );
  return { data, methodCall, allowTokensConfirmations };
}
