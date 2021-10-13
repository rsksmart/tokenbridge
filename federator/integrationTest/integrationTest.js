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

const mainchainFederators = getMainchainFederators(mainKeys);
const sidechainFederators = getSidechainFederators(sideKeys, sideConfig);

const ONE_DAY_IN_SECONDS = 24 * 3600;
const SIDE_TOKEN_SYMBOL = "MAIN";
const SIDE_TOKEN_NAME = "MAIN";
const MAIN_CHAIN_LOGGER_NAME = "MAIN";
const SIDE_CHAIN_LOGGER_NAME = "SIDE";
const SIDE_TOKEN_TYPE_ID = 0;
const SIDE_TOKEN_DECIMALS = 18;

run({ mainchainFederators, sidechainFederators, config, sideConfig });

function getMainchainFederators(keys) {
  let federators = [];
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new Federator(
        {
          ...config,
          privateKey: key,
          storagePath: `${config.storagePath}/fed-${i + 1}`,
        },
        log4js.getLogger("FEDERATOR")
      );
      federators.push(federator);
    });
  } else {
    const federator = new Federator(config, log4js.getLogger("FEDERATOR"));
    federators.push(federator);
  }
  return federators;
}

function getSidechainFederators(keys, sideConfig) {
  let federators = [];
  if (keys && keys.length) {
    keys.forEach((key, i) => {
      const federator = new Federator(
        {
          ...sideConfig,
          privateKey: key,
          storagePath: `${config.storagePath}/side-fed-${i + 1}`,
        },
        log4js.getLogger("FEDERATOR")
      );
      federators.push(federator);
    });
  } else {
    const federator = new Federator(
      {
        ...sideConfig,
        storagePath: `${config.storagePath}/side-fed`,
      },
      log4js.getLogger("FEDERATOR")
    );
    federators.push(federator);
  }
  return federators;
}

async function run({
  mainchainFederators,
  sidechainFederators,
  config,
  sideConfig,
}) {
  logger.info("Starting transfer from Mainchain to Sidechain");
  await transfer(
    mainchainFederators,
    sidechainFederators,
    config,
    MAIN_CHAIN_LOGGER_NAME,
    SIDE_CHAIN_LOGGER_NAME
  );
  logger.info("Completed transfer from Mainchain to Sidechain");

  logger.info("Starting transfer from Sidechain to Mainchain");
  await transfer(
    sidechainFederators,
    mainchainFederators,
    sideConfig,
    SIDE_CHAIN_LOGGER_NAME,
    MAIN_CHAIN_LOGGER_NAME
  );
  logger.info("Completed transfer from Sidechain to Mainchain");
}

async function transfer(
  originFederators,
  destinationFederators,
  config,
  originLoggerName,
  destinationLoggerName
) {
  try {
    const mainChainWeb3 = new Web3(config.mainchain.host);
    const sideChainWeb3 = new Web3(config.sidechain.host);
    // Increase time in one day to reset all the Daily limits from AllowTokens
    await utils.increaseTimestamp(mainChainWeb3, ONE_DAY_IN_SECONDS + 1);
    await utils.increaseTimestamp(sideChainWeb3, ONE_DAY_IN_SECONDS + 1);
    const originTokenContract = new mainChainWeb3.eth.Contract(
      abiMainToken,
      config.mainchain.testToken
    );
    const transactionSender = new TransactionSender(
      mainChainWeb3,
      logger,
      config
    );
    const destinationTransactionSender = new TransactionSender(
      sideChainWeb3,
      logger,
      config
    );
    const originBridgeAddress = config.mainchain.bridge;
    const amount = mainChainWeb3.utils.toWei("10");
    const originAddress = originTokenContract.options.address;
    const cowAddress = (await mainChainWeb3.eth.getAccounts())[0];
    const allowTokensContract = new mainChainWeb3.eth.Contract(
      abiAllowTokensV1,
      config.mainchain.allowTokens
    );
    const sideMultiSigContract = new mainChainWeb3.eth.Contract(
      abiMultiSig,
      config.sidechain.multiSig
    );
    const sideAllowTokensAddress = config.sidechain.allowTokens;
    const destinationBridgeAddress = config.sidechain.bridge;
    logger.debug(
      `${destinationLoggerName} bridge address`,
      destinationBridgeAddress
    );
    const destinationBridgeContract = new sideChainWeb3.eth.Contract(
      abiBridgeV3,
      destinationBridgeAddress
    );

    let data = "";
    let txDataHash = "";
    let receipt = "";
    let methodCall = "";

    logger.debug("Get the destination token address");
    const destinationTokenAddress = await getDestinationTokenAddress(
      destinationBridgeContract,
      originAddress,
      sideMultiSigContract,
      destinationTransactionSender,
      config,
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
      config.privateKey
    );
    await destinationTransactionSender.sendTransaction(
      userAddress,
      "",
      mainChainWeb3.utils.toWei("1"),
      config.privateKey,
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
    data = originTokenContract.methods
      .transfer(userAddress, amount)
      .encodeABI();
    await transactionSender.sendTransaction(
      originAddress,
      data,
      0,
      config.privateKey,
      true
    );
    await originTokenContract.methods
      .approve(originBridgeAddress, amount)
      .call({ from: userAddress });
    data = originTokenContract.methods
      .approve(originBridgeAddress, amount)
      .encodeABI();
    await transactionSender.sendTransaction(
      originAddress,
      data,
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
    console.log("Bridge addr", originBridgeAddress);
    console.log("allowTokens addr", allowTokensContract.options.address);
    console.log(
      "Bridge AllowTokensAddr",
      await bridgeContract.methods.allowTokens().call()
    );
    console.log(
      "allowTokens primary",
      await allowTokensContract.methods.primary().call()
    );
    console.log(
      "allowTokens owner",
      await allowTokensContract.methods.owner().call()
    );
    console.log("accounts:", await mainChainWeb3.eth.getAccounts());
    methodCall = bridgeContract.methods.receiveTokensTo(
      originAddress,
      userAddress,
      amount
    );
    await methodCall.call({ from: userAddress });
    receipt = await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Bridge receivedTokens completed");

    let waitBlocks = config.confirmations || 0;
    logger.debug(`Wait for ${waitBlocks} blocks`);
    await utils.waitBlocks(mainChainWeb3, waitBlocks);

    logger.debug("Starting federator processes");

    // Start origin federators with delay between them
    logger.debug("Fund federator wallets");
    let federatorKeys =
      mainKeys && mainKeys.length ? mainKeys : [config.privateKey];
    await fundFederators(
      config.sidechain.host,
      federatorKeys,
      config.sidechain.privateKey,
      sideChainWeb3.utils.toWei("1")
    );

    await originFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.info(
      "------------- RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
    );

    txDataHash = await destinationBridgeContract.methods
      .transactionsDataHashes(receipt.transactionHash)
      .call();
    if (txDataHash === utils.zeroHash) {
      logger.error(MSG_TOKEN_NOT_VOTED);
      process.exit(1);
    }

    await claimTokensFromDestinationBridge(
      destinationBridgeContract,
      userAddress,
      amount,
      receipt,
      destinationTransactionSender,
      destinationBridgeAddress,
      userPrivateKey
    );

    logger.debug("Check balance on the other side");
    let destinationTokenContract = new sideChainWeb3.eth.Contract(
      abiSideToken,
      destinationTokenAddress
    );
    let balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    if (balance.toString() === "0") {
      logger.error("Token was not claimed");
      process.exit(1);
    }
    logger.info(`${destinationLoggerName} token balance`, balance);

    let crossCompletedBalance = await mainChainWeb3.eth.getBalance(userAddress);
    logger.debug(
      "One way cross user balance (ETH or RBTC)",
      crossCompletedBalance
    );

    // Transfer back
    logger.info("------------- TRANSFER BACK THE TOKENS -----------------");
    logger.debug("Getting initial balances before transfer");
    const bridgeBalanceBefore = await originTokenContract.methods
      .balanceOf(originBridgeAddress)
      .call();
    const receiverBalanceBefore = await originTokenContract.methods
      .balanceOf(userAddress)
      .call();
    let senderBalanceBefore = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug(
      `bridge balance:${bridgeBalanceBefore}, receiver balance:${receiverBalanceBefore}, sender balance:${senderBalanceBefore} `
    );
    await destinationTransactionSender.sendTransaction(
      userAddress,
      "",
      6000000,
      config.privateKey,
      true
    );

    logger.debug("Approving token transfer on destination");
    data = destinationTokenContract.methods
      .approve(destinationBridgeAddress, amount)
      .encodeABI();
    await destinationTransactionSender.sendTransaction(
      destinationTokenAddress,
      data,
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

    if (federatorKeys.length === 1) {
      const multiSigData = sideMultiSigContract.methods
        .submitTransaction(sideAllowTokensAddress, 0, data)
        .encodeABI();
      await destinationTransactionSender.sendTransaction(
        config.sidechain.multiSig,
        multiSigData,
        0,
        "",
        true
      );
    } else {
      const multiSigData = sideMultiSigContract.methods
        .submitTransaction(sideAllowTokensAddress, 0, data)
        .encodeABI();
      await destinationTransactionSender.sendTransaction(
        config.sidechain.multiSig,
        multiSigData,
        0,
        federatorKeys[0],
        true
      );

      const nextTransactionCount = await sideMultiSigContract.methods
        .getTransactionCount(true, false)
        .call();
      for (let i = 1; i < federatorKeys.length; i++) {
        const multiSigData = sideMultiSigContract.methods
          .confirmTransaction(nextTransactionCount)
          .encodeABI();
        await destinationTransactionSender.sendTransaction(
          config.sidechain.multiSig,
          multiSigData,
          0,
          federatorKeys[i],
          true
        );
      }
    }

    logger.debug("Bridge side receiveTokens");
    methodCall = destinationBridgeContract.methods.receiveTokensTo(
      destinationTokenAddress,
      userAddress,
      amount
    );
    await methodCall.call({ from: userAddress });
    receipt = await destinationTransactionSender.sendTransaction(
      destinationBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Bridge side receiveTokens completed");

    logger.debug("Starting federator processes");

    logger.debug("Fund federator wallets");
    federatorKeys =
      sideKeys && sideKeys.length ? sideKeys : [config.privateKey];
    await fundFederators(
      config.mainchain.host,
      federatorKeys,
      config.mainchain.privateKey,
      mainChainWeb3.utils.toWei("1")
    );

    // Start destination federators with delay between them
    await destinationFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.info(
      "------------- RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
    );
    logger.debug("Check balance on the starting side");
    methodCall = bridgeContract.methods.claim({
      to: userAddress,
      amount: amount,
      blockHash: receipt.blockHash,
      transactionHash: receipt.transactionHash,
      logIndex: receipt.logs[6].logIndex,
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
    let bridgeBalanceAfter = await originTokenContract.methods
      .balanceOf(originBridgeAddress)
      .call();
    let receiverBalanceAfter = await originTokenContract.methods
      .balanceOf(userAddress)
      .call();
    let senderBalanceAfter = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug(
      `bridge balance:${bridgeBalanceAfter}, receiver balance:${receiverBalanceAfter}, sender balance:${senderBalanceAfter} `
    );

    let expectedBalance = BigInt(bridgeBalanceBefore) - BigInt(amount);
    if (expectedBalance !== BigInt(bridgeBalanceAfter)) {
      logger.error(
        `Wrong Bridge balance. Expected ${expectedBalance} but got ${bridgeBalanceAfter}`
      );
      process.exit(1);
    }

    expectedBalance = BigInt(receiverBalanceBefore) + BigInt(amount);
    if (expectedBalance !== BigInt(receiverBalanceAfter)) {
      logger.error(
        `Wrong Receiver balance. Expected ${receiverBalanceBefore} but got ${receiverBalanceAfter}`
      );
      process.exit(1);
    }

    expectedBalance = BigInt(senderBalanceBefore) - BigInt(amount);
    if (expectedBalance !== BigInt(senderBalanceAfter)) {
      logger.error(
        `Wrong Sender balance. Expected ${expectedBalance} but got ${senderBalanceAfter}`
      );
      process.exit(1);
    }

    let crossBackCompletedBalance = await mainChainWeb3.eth.getBalance(
      userAddress
    );
    logger.debug("Final user balance", crossBackCompletedBalance);
    logger.debug(
      "Cost: ",
      BigInt(initialUserBalance) - BigInt(crossBackCompletedBalance)
    );

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
    data = anotherTokenContract.methods
      .mint(userAddress, amount, "0x", "0x")
      .encodeABI();
    await transactionSender.sendTransaction(
      anotherTokenAddress,
      data,
      0,
      userPrivateKey,
      true
    );

    logger.debug("Adding new token to list of allowed on bridge");
    const multiSigContract = new mainChainWeb3.eth.Contract(
      abiMultiSig,
      config.mainchain.multiSig
    );
    const allowTokensAddress = allowTokensContract.options.address;
    data = allowTokensContract.methods
      .setToken(anotherTokenAddress, SIDE_TOKEN_TYPE_ID)
      .encodeABI();

    if (federatorKeys.length === 1) {
      const multiSigData = multiSigContract.methods
        .submitTransaction(allowTokensAddress, 0, data)
        .encodeABI();
      await transactionSender.sendTransaction(
        config.mainchain.multiSig,
        multiSigData,
        0,
        "",
        true
      );
    } else {
      const multiSigData = multiSigContract.methods
        .submitTransaction(allowTokensAddress, 0, data)
        .encodeABI();
      await transactionSender.sendTransaction(
        config.mainchain.multiSig,
        multiSigData,
        0,
        federatorKeys[0],
        true
      );

      const nextTransactionCount = await multiSigContract.methods
        .getTransactionCount(true, false)
        .call();
      for (let i = 1; i < federatorKeys.length; i++) {
        const multiSigData = multiSigContract.methods
          .confirmTransaction(nextTransactionCount)
          .encodeABI();
        await transactionSender.sendTransaction(
          config.mainchain.multiSig,
          multiSigData,
          0,
          federatorKeys[i],
          true
        );
      }
    }

    let destinationAnotherTokenAddress = await getDestinationTokenAddress(
      destinationBridgeContract,
      anotherTokenAddress,
      sideMultiSigContract,
      destinationTransactionSender,
      config,
      destinationLoggerName
    );

    methodCall = anotherTokenContract.methods.send(
      originBridgeAddress,
      amount,
      "0x"
    );
    await methodCall.call({ from: userAddress });
    receipt = await transactionSender.sendTransaction(
      anotherTokenAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Call to transferAndCall completed");

    logger.debug(`Wait for ${waitBlocks} blocks`);
    await utils.waitBlocks(mainChainWeb3, waitBlocks);

    await originFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.info(
      "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE OTHER SIDE -----------------"
    );

    await claimTokensFromDestinationBridge(
      destinationBridgeContract,
      userAddress,
      amount,
      receipt,
      destinationTransactionSender,
      destinationBridgeAddress,
      userPrivateKey
    );

    destinationTokenContract = new sideChainWeb3.eth.Contract(
      abiSideToken,
      destinationAnotherTokenAddress
    );

    logger.debug("Check balance on the other side");
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.info(`${destinationLoggerName} token balance`, balance);
    if (balance.toString() === "0") {
      logger.error("Token was not claimed");
      process.exit(1);
    }

    crossCompletedBalance = await mainChainWeb3.eth.getBalance(userAddress);
    logger.debug("One way cross user balance", crossCompletedBalance);

    logger.info(
      "------------- CONTRACT ERC777 TEST TRANSFER BACK THE TOKENS -----------------"
    );
    senderBalanceBefore = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();

    methodCall = destinationTokenContract.methods.send(
      destinationBridgeAddress,
      amount,
      "0x"
    );
    methodCall.call({ from: userAddress });
    receipt = await destinationTransactionSender.sendTransaction(
      destinationAnotherTokenAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );

    logger.debug(`Wait for ${waitBlocks} blocks`);
    await utils.waitBlocks(sideChainWeb3, waitBlocks);

    await destinationFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    txDataHash = await bridgeContract.methods
      .transactionsDataHashes(receipt.transactionHash)
      .call();
    if (txDataHash === utils.zeroHash) {
      logger.error(MSG_TOKEN_NOT_VOTED);
      process.exit(1);
    }

    logger.info(
      "------------- CONTRACT ERC777 TEST RECEIVE THE TOKENS ON THE STARTING SIDE -----------------"
    );
    methodCall = bridgeContract.methods.claim({
      to: userAddress,
      amount: amount,
      blockHash: receipt.blockHash,
      transactionHash: receipt.transactionHash,
      logIndex: receipt.logs[5].logIndex,
    });
    await methodCall.call({ from: userAddress });
    await destinationTransactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Destination Bridge claim completed");
    logger.debug("Getting final balances");
    bridgeBalanceAfter = await originTokenContract.methods
      .balanceOf(originBridgeAddress)
      .call();
    receiverBalanceAfter = await originTokenContract.methods
      .balanceOf(userAddress)
      .call();
    senderBalanceAfter = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug(
      `bridge balance:${bridgeBalanceAfter}, receiver balance:${receiverBalanceAfter}, sender balance:${senderBalanceAfter} `
    );

    if (senderBalanceBefore === BigInt(senderBalanceAfter)) {
      logger.error(
        `Wrong Sender balance. Expected Sender balance to change but got ${senderBalanceAfter}`
      );
      process.exit(1);
    }

    crossBackCompletedBalance = await mainChainWeb3.eth.getBalance(userAddress);
    logger.debug("Final user balance", crossBackCompletedBalance);

    logger.info(
      "------------- SMALL, MEDIUM and LARGE amounts are processed after required confirmations  -----------------"
    );

    await allowTokensContract.methods
      .setConfirmations("100", "1000", "2000")
      .call({ from: config.mainchain.multiSig });
    data = allowTokensContract.methods
      .setConfirmations("100", "1000", "2000")
      .encodeABI();

    methodCall = multiSigContract.methods.submitTransaction(
      allowTokensAddress,
      0,
      data
    );
    await methodCall.call({ from: cowAddress });
    await methodCall.send({ from: cowAddress, gas: 500000 });

    await utils.evm_mine(1, mainChainWeb3);
    const confirmations = await allowTokensContract.methods
      .getConfirmations()
      .call();

    data = anotherTokenContract.methods
      .mint(userAddress, amount, "0x", "0x")
      .encodeABI();
    await transactionSender.sendTransaction(
      anotherTokenAddress,
      data,
      0,
      userPrivateKey,
      true
    );
    let remainingUserBalance = await mainChainWeb3.eth.getBalance(userAddress);
    logger.debug(
      "user native token balance before crossing tokens:",
      remainingUserBalance
    );

    let userBalanceAnotherToken = await anotherTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug(
      "user balance before crossing tokens:",
      userBalanceAnotherToken
    );
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.info(
      `${destinationLoggerName} token balance before crossing`,
      balance
    );

    destinationAnotherTokenAddress = await destinationBridgeContract.methods
      .mappedTokens(anotherTokenAddress)
      .call();
    logger.info(
      `${destinationLoggerName} token address`,
      destinationAnotherTokenAddress
    );
    if (destinationAnotherTokenAddress === utils.zeroAddress) {
      logger.error(MSG_TOKEN_NOT_VOTED);
      process.exit(1);
    }

    logger.debug("Check balance on the other side before crossing");
    destinationTokenContract = new sideChainWeb3.eth.Contract(
      abiSideToken,
      destinationAnotherTokenAddress
    );
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
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
    methodCall = anotherTokenContract.methods.approve(
      originBridgeAddress,
      userAppoveTotalAmount
    );
    await methodCall.call({ from: userAddress });
    await transactionSender.sendTransaction(
      anotherTokenAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );

    // Cross AnotherToken (type id 0) Small Amount < toWei('0.01')
    methodCall = bridgeContract.methods.receiveTokensTo(
      anotherTokenAddress,
      userAddress,
      userSmallAmount
    );
    await methodCall.call({ from: userAddress });
    const smallAmountReceipt = await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );

    // Cross AnotherToken (type id 0) Medium Amount >= toWei('0.01') && < toWei('0.1')
    methodCall = bridgeContract.methods.receiveTokensTo(
      anotherTokenAddress,
      userAddress,
      userMediumAmount
    );
    await methodCall.call({ from: userAddress });
    const mediumAmountReceipt = await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );

    // Cross AnotherToken (type id 0) Large Amount >= toWei('0.1')
    methodCall = bridgeContract.methods.receiveTokensTo(
      anotherTokenAddress,
      userAddress,
      userLargeAmount
    );
    await methodCall.call({ from: userAddress });
    const largeAmountReceipt = await transactionSender.sendTransaction(
      originBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );

    logger.debug("Mine small amount confirmations blocks");
    const delta_1 = parseInt(confirmations.smallAmount);
    await utils.evm_mine(delta_1, mainChainWeb3);

    await originFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.debug("Claim small amounts");
    methodCall = destinationBridgeContract.methods.claim({
      to: userAddress,
      amount: userSmallAmount,
      blockHash: smallAmountReceipt.blockHash,
      transactionHash: smallAmountReceipt.transactionHash,
      logIndex: smallAmountReceipt.logs[4].logIndex,
    });
    await methodCall.call({ from: userAddress });
    await destinationTransactionSender.sendTransaction(
      destinationBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Small amount claim completed");

    // check small amount txn went through
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.info(
      `DESTINATION ${destinationLoggerName} token balance after ${delta_1} confirmations`,
      balance
    );

    expectedBalance =
      BigInt(destinationInitialUserBalance) + BigInt(userSmallAmount);
    if (expectedBalance !== BigInt(balance)) {
      logger.error(
        `userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalance} but got ${balance}`
      );
      process.exit(1);
    }

    logger.debug("Mine medium amount confirmations blocks");
    const delta_2 = parseInt(confirmations.mediumAmount) - delta_1;
    await utils.evm_mine(delta_2, mainChainWeb3);

    await originFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.debug("Claim medium amounts");
    methodCall = destinationBridgeContract.methods.claim({
      to: userAddress,
      amount: userMediumAmount,
      blockHash: mediumAmountReceipt.blockHash,
      transactionHash: mediumAmountReceipt.transactionHash,
      logIndex: mediumAmountReceipt.logs[4].logIndex,
    });
    await methodCall.call({ from: userAddress });
    await destinationTransactionSender.sendTransaction(
      destinationBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Medium amount claim completed");

    // check medium amount txn went through
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.info(
      `DESTINATION ${destinationLoggerName} token balance after ${
        delta_1 + delta_2
      } confirmations`,
      balance
    );

    expectedBalance =
      BigInt(destinationInitialUserBalance) +
      BigInt(userMediumAmount) +
      BigInt(userSmallAmount);
    if (expectedBalance !== BigInt(balance)) {
      logger.error(
        `userMediumAmount + userSmallAmount. Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalance} but got ${balance}`
      );
      process.exit(1);
    }

    logger.debug("Mine large amount confirmations blocks");
    const delta_3 = parseInt(confirmations.largeAmount) - delta_2;
    await utils.evm_mine(delta_3, mainChainWeb3);

    await originFederators.reduce(function (promise, item) {
      return promise.then(function () {
        return item.run();
      });
    }, Promise.resolve());

    logger.debug("Claim large amounts");
    methodCall = destinationBridgeContract.methods.claim({
      to: userAddress,
      amount: userLargeAmount,
      blockHash: largeAmountReceipt.blockHash,
      transactionHash: largeAmountReceipt.transactionHash,
      logIndex: largeAmountReceipt.logs[4].logIndex,
    });
    await methodCall.call({ from: userAddress });
    await destinationTransactionSender.sendTransaction(
      destinationBridgeAddress,
      methodCall.encodeABI(),
      0,
      userPrivateKey,
      true
    );
    logger.debug("Large amount claim completed");

    // check large amount txn went through
    balance = await destinationTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.info(
      `DESTINATION ${destinationLoggerName} token balance after ${
        delta_1 + delta_2 + delta_3
      } confirmations`,
      balance
    );

    expectedBalance =
      BigInt(destinationInitialUserBalance) +
      BigInt(userLargeAmount) +
      BigInt(userMediumAmount) +
      BigInt(userSmallAmount);
    if (expectedBalance !== BigInt(balance)) {
      logger.error(
        `Wrong AnotherToken ${destinationLoggerName} User balance. Expected ${expectedBalance} but got ${balance}`
      );
      process.exit(1);
    }

    userBalanceAnotherToken = await anotherTokenContract.methods
      .balanceOf(userAddress)
      .call();
    logger.debug(
      "ORIGIN user balance after crossing:",
      userBalanceAnotherToken
    );

    await resetConfirmationsForFutureRuns(
      allowTokensContract,
      config,
      data,
      methodCall,
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
  config,
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
      config.sidechain.multiSig,
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
  config,
  data,
  methodCall,
  multiSigContract,
  allowTokensAddress,
  cowAddress,
  mainChainWeb3,
  confirmations
) {
  await allowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .call({ from: config.mainchain.multiSig });
  data = allowTokensContract.methods
    .setConfirmations("0", "0", "0")
    .encodeABI();

  methodCall = multiSigContract.methods.submitTransaction(
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
