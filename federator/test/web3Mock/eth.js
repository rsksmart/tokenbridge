const contractMapping = require('./contractMapping');
const defaults = require('./defaults');

let eth = {};

eth.getBlockNumber = () => defaults.data.blockNumber;
eth.getAccounts = () => defaults.data.accounts;
eth.getTransactionCount = () => defaults.data.ethTransactionCount;
eth.getGasPrice = () => defaults.data.gasPrice;
eth.sendSignedTransaction = () => Promise.resolve(defaults.data.receipt);

eth.Contract = contractMapping;

eth.net = {
    getId: () => defaults.data.netId
}

module.exports = eth;
