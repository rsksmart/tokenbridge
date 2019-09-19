const RLP = require('ethereumjs-util').rlp;
const Web3 = require('web3');
const toHex = Web3.utils.toHex;
const hexToBytes = Web3.utils.hexToBytes;

function fixHexCeros(list) {
    return list.map((x) => { return parseInt(x) == 0 ? '0x' : x});
}

function getRawBlockHeader(blockHeader, chainId) {
    let dataToEncode = [
      blockHeader.parentHash, 
      blockHeader.sha3Uncles,
      blockHeader.miner,
      blockHeader.stateRoot,
      blockHeader.transactionsRoot,
      blockHeader.receiptsRoot,
      blockHeader.logsBloom,
      toHex(blockHeader.difficulty),
      toHex(blockHeader.number),
      toHex(blockHeader.gasLimit),
      toHex(blockHeader.gasUsed),
      toHex(blockHeader.timestamp),
      blockHeader.extraData,
      blockHeader.paidFees,
      blockHeader.minimumGasPrice,
      blockHeader.uncles.length,
      blockHeader.bitcoinMergedMiningHeader
    ];
    //Check if its mainnet and RskIp92 is active
    if(chainId == 30 && blockHeader.number < 729000) {
      dataToEncode.push(blockHeader.bitcoinMergedMiningMerkleProof);
      dataToEncode.push(blockHeader.bitcoinMergedMiningCoinbaseTransaction);
    }
    dataToEncode = fixHexCeros(dataToEncode);
    return RLP.encode(dataToEncode);
  }

  function getRawTransaction(tx) {
    let dataToEncode = [
      toHex(tx.nonce),
      toHex(tx.gasPrice),
      toHex(tx.gas),
      tx.to,
      toHex(tx.value),
      tx.input,
      tx.v,
      tx.r,
      tx.s
    ];
    dataToEncode = fixHexCeros(dataToEncode);
    return RLP.encode(dataToEncode);
  }

  function getRawTransactionReceipt(txReceipt) {
    let dataToEncode = [
      toHex(txReceipt.root),
      toHex(txReceipt.cumulativeGasUsed),
      txReceipt.logsBloom
    ];
    let dataLogList = [];
    for(let log of txReceipt.logs) {
        let encodedTopics = [];
        for(let topic of log.topics) {
            encodedTopics.push(Buffer.from(hexToBytes(topic)));
      }
      
      let dataLog = [
        Buffer.from(hexToBytes(log.address)),
        encodedTopics,
        Buffer.from(hexToBytes(log.data))
      ];
      dataLogList.push(dataLog);
    }
    dataToEncode.push(dataLogList);
    dataToEncode.push(toHex(txReceipt.gasUsed));
    dataToEncode.push(toHex(txReceipt.status));
    dataToEncode = fixHexCeros(dataToEncode);

    return RLP.encode(dataToEncode);
  }

  module.exports = {
    getRawBlockHeader: getRawBlockHeader,
    getRawTransaction: getRawTransaction,
    getRawTransactionReceipt: getRawTransactionReceipt
  }