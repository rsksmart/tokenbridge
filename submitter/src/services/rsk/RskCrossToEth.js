const Web3 = require('web3');
const ethUtils = require('ethereumjs-util');
const RLP = ethUtils.rlp;
//abi
const abiBridge = require('../../abis/Bridge.json');
const abiManager = require('../../abis/Manager.json');
//lib
const utils = require('../../lib/utils.js');
const TransactionSender = require('../../lib/TransactionSender.js');

module.exports = class RskCrossToEth {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async run(waitForConfirmations) {
    try {
      let ethWeb3 = new Web3(this.config.eth.host);
      let rskWeb3 = this.getRskWeb3Extended();

      if(waitForConfirmations) {
        const numberOfBlocks = this.config.confirmations
        this.logger.debug(`Wait for ${numberOfBlocks} blocks`);
        await utils.waitBlocks(rskWeb3, numberOfBlocks);
      }
      const currentBlock = await rskWeb3.eth.getBlockNumber();
      const toBlock = currentBlock - this.config.confirmations || 0;
      this.logger.info('run to Block', toBlock);
      if (toBlock <= 0) {
        return false; 
      }

      const sideManagerContract = new ethWeb3.eth.Contract(abiManager, this.config.eth.manager);
      const transactionSender = new TransactionSender(ethWeb3, this.logger);
      const from = await transactionSender.getAddress(this.config.eth.privateKey);
      const lastBlockNumber = await sideManagerContract.methods.lastBlockNumber(from).call();
      let fromBlock = this.config.rsk.fromBlock;
      if(lastBlockNumber && lastBlockNumber > fromBlock) {
        fromBlock = lastBlockNumber;
      }
      this.logger.debug('run from Block', fromBlock);

      const bridgeContract = new rskWeb3.eth.Contract(abiBridge, this.config.rsk.bridge);
      const logs = await bridgeContract.getPastEvents( "Cross", {
        fromBlock: fromBlock || "0x01",
        toBlock: toBlock || "latest"
      });
      this.logger.info(`Found ${logs.length} logs`);

      for(let log of logs) {
        this.logger.info('log', log);
        let rawBlockHeader = await rskWeb3.extended.getRawBlockHeaderByNumber(log.blockNumber);
        let rawTxReceipt = await rskWeb3.extended.getRawTransactionReceiptByHash(log.transactionHash);
        let txReceiptNode = await rskWeb3.extended.getTransactionReceiptNodesByHash(log.blockHash, log.transactionHash);
        let rawTxReceiptNode = ethUtils.bufferToHex(RLP.encode(txReceiptNode));
        
        let txReceiptHash = Web3.utils.keccak256(rawTxReceipt);
        let wasProcessed = await sideManagerContract.methods.transactionWasProcessed(log.blockNumber, log.blockHash, txReceiptHash).call();
        if(!wasProcessed) {
          this.logger.warn(`Transaction was Already Processed for blockNumber:${log.blockNumber}, blockHash:${log.blockHash}, transactionHash:${log.transactionHash}`);
          return false;
        }
        
        let result = await sideManagerContract.methods.processCrossEvent(rawBlockHeader, rawTxReceipt, rawTxReceiptNode).call();
        if(!result) {
          this.logger.warn(`Failed call to processCrossEvent for blockNumber:${log.blockNumber}, blockHash:${log.blockHash}, transactionHash:${log.transactionHash}`);
          return false;
        }
        
        this.logger.info(`Start processCrossEvent for blockNumber:${log.blockNumber}, blockHash:${log.blockHash}, transactionHash:${log.transactionHash}`);
        let data = sideManagerContract.methods.processCrossEvent(log.blockNumber, log.blockHash, txReceiptHash, rawBlockHeader, rawTxReceipt, rawTxReceiptNode).encodeABI();
        await transactionSender.sendTransaction(sideManagerContract.options.address, data, 0, this.config.eth.privateKey);

        return true;
      }
    } catch (err) {
        this.logger.error('Exception Crossing RSK Event', err);
        process.exit()
    }

  }



  getRskWeb3Extended() {
    let rskWeb3 = new Web3(this.config.rsk.host);
    rskWeb3.extend({
      property: 'extended',
      methods: [
        {
          name: 'getTransactionReceiptNodesByHash',
          call: 'eth_getTransactionReceiptNodesByHash',
          params: 2
        },
        {
          name: 'getRawTransactionReceiptByHash',
          call: 'eth_getRawTransactionReceiptByHash',
          params: 1
        },
        {
          name: 'getRawBlockHeaderByHash',
          call: 'eth_getRawBlockHeaderByHash',
          params: 1
        },
        {
          name: 'getRawBlockHeaderByNumber',
          call: 'eth_getRawBlockHeaderByNumber',
          params: 1,
          inputFormatter: [rskWeb3.extend.formatters.inputDefaultBlockNumberFormatter]
        }
      ]
    });
    return rskWeb3;
  }

}
