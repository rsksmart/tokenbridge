const TransactionSender = require('./src/lib/TransactionSender.js');

async function fundFederators(web3, keys, privateKey, logger) {
    const transactionSender = new TransactionSender(web3, logger);

    for (let i = 0; i < keys.length; i++) {
        const federatorAddress = await transactionSender.getAddress(keys[i]);
        await transactionSender.sendTransaction(federatorAddress, '', web3.utils.toWei('1'), privateKey);
    }
}

module.exports = fundFederators;
