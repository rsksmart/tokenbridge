const Web3 = require('web3');
const log4js = require('log4js');

const logConfig = require('./log-config.json');
const TransactionSender = require('./src/lib/TransactionSender.js');

const logger = log4js.getLogger('Fund Federators');
log4js.configure(logConfig);

/**
 * Use this function as an executable script to fund a wallet.
 * Example invocation:
 *
 * node fundFederators.js "http://localhost:8545" "key1, key2" "pkey" "100000"
 *
 */

let host = process.argv[2];
let keys = process.argv[3];
let privateKey = process.argv[4];
let amount = process.argv[5];

if (process.argv.length > 2) {
    keys = keys.replace(/ /g, '').split(',') || [];
    fundFederators(host, keys, privateKey, amount);
}

async function fundFederators(host, keys, privateKey, amount) {
    const web3 = new Web3(host);
    const transactionSender = new TransactionSender(web3, logger);

    for (let i = 0; i < keys.length; i++) {
        try {
            const federatorAddress = await transactionSender.getAddress(keys[i]);
            await transactionSender.sendTransaction(federatorAddress, '', amount, privateKey);
            logger.info(`Successfuly transferred ${amount} to ${federatorAddress}`);
        } catch (err) {
            logger.error('Error transferring to wallet', err);
        }
    }
}

module.exports = fundFederators;
