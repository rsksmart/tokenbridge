const Web3 = require("web3");
const logs = require("../src/lib/logs");

const TransactionSender = require("../src/lib/TransactionSender");

const logWrapper = logs.Logs.getInstance().getLogger(
  logs.LOGGER_CATEGORY_FEDERATOR_FUND
);

/**
 * Use this function as an executable script to fund a wallet on a test enviroment
 * Example invocation:
 *
 * node fundFederators.js "http://localhost:8545" "key1, key2" "pkey" "100000"
 *
 */

let scriptPath = process.argv[1];
let host = process.argv[2];
let keys = process.argv[3];
let privateKey = process.argv[4];
let amount = process.argv[5];

if (scriptPath.indexOf("fundFederators") !== -1) {
  keys = keys.replace(/ /g, "").split(",") || [];
  fundFederators(host, keys, privateKey, amount);
}

async function fundFederators(host, keys, privateKey, amount) {
  const web3 = new Web3(host);
  const transactionSender = new TransactionSender.default(web3, logWrapper, {});

  for (let i = 0; i < keys.length; i++) {
    try {
      const federatorAddress = await transactionSender.getAddress(keys[i]);
      await transactionSender.sendTransaction(
        federatorAddress,
        "",
        amount,
        privateKey
      );
      logWrapper.debug(
        `Successfuly transferred ${amount} to ${federatorAddress}`
      );
    } catch (err) {
      logWrapper.error("Error transferring to wallet", err);
    }
  }
}

module.exports = fundFederators;
