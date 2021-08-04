const contractMapping = require('./contractMapping');
const defaults = require('./defaults');
const Web3PromiEvent = require('web3-core-promievent');

let eth = {};

eth.getBlockNumber = () => defaults.data.blockNumber;
eth.getAccounts = () => defaults.data.accounts;
eth.getTransactionCount = () => defaults.data.ethTransactionCount;
eth.getGasPrice = () => defaults.data.gasPrice;

let promiseSend = function(){
    const promiEvent = Web3PromiEvent();

    setTimeout(function() {
        promiEvent.eventEmitter.emit('transactionHash', defaults.data.receipt.transactionHash);
        promiEvent.resolve(defaults.data.receipt);
    }, 10);
    
    return promiEvent.eventEmitter;
};
eth.sendSignedTransaction = promiseSend;
eth.sendTransaction = promiseSend;

eth.Contract = contractMapping;

eth.net = {
    getId: () => defaults.data.netId
}

module.exports = eth;
