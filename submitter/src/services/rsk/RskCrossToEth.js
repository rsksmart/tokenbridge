const Web3 = require('web3');
const ethUtils = require('ethereumjs-util');
const RLP = ethUtils.rlp;
//abi
const abiBridge = require('../../abis/Bridge.json');
const abiBlockRecorder = require('../../abis/BlockRecorder.json');
const abiEventsProcessor = require('../../abis/EventsProcessor.json');
//lib
const utils = require('../../lib/utils.js');
const TransactionSender = require('../../lib/TransactionSender.js');

function calculatePrefixesSuffixes(nodes) {
    const prefixes = [];
    const suffixes = [];
    const ns = [];
    
    for (let k = 0, l = nodes.length; k < l; k++) {
        if (k + 1 < l && nodes[k+1].indexOf(nodes[k]) >= 0)
            continue;
        
        ns.push(nodes[k]);
    }
    
    let hash = Web3.utils.sha3(Buffer.from(ns[0], 'hex'));
    
    if (hash.substring(0, 2).toLowerCase() === '0x')
        hash = hash.substring(2);
    
    prefixes.push('0x');
    suffixes.push('0x');
    
    for (let k = 1, l = ns.length; k < l; k++) {
        const p = ns[k].indexOf(hash);
        
        prefixes.push('0x' + ns[k].substring(0, p));
        suffixes.push('0x' + ns[k].substring(p + hash.length));
        
        hash = Web3.utils.sha3(Buffer.from(ns[k], 'hex'));
        
        if (hash.substring(0, 2).toLowerCase() === '0x')
            hash = hash.substring(2);
    }
    
    return { prefixes: prefixes, suffixes: suffixes };
}

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

      const sideBlockRecorderContract = new ethWeb3.eth.Contract(abiBlockRecorder, this.config.eth.blockRecorder);
      const sideEventsProcessorContract = new ethWeb3.eth.Contract(abiEventsProcessor, this.config.eth.eventsProcessor);
      
      const transactionSender = new TransactionSender(ethWeb3, this.logger);
      const from = await transactionSender.getAddress(this.config.eth.privateKey);
      let fromBlock = this.config.rsk.fromBlock;
      
      this.logger.debug('run from Block', fromBlock);

      const bridgeContract = new rskWeb3.eth.Contract(abiBridge, this.config.rsk.bridge);
      
      const logs = await bridgeContract.getPastEvents( "Cross", {
        fromBlock: fromBlock || "0x01",
        toBlock: toBlock || "latest"
      });
      
      this.logger.info(`Found ${logs.length} logs`);
      
      let origin = await sideEventsProcessorContract.methods.origin().call();
      
      this.logger.info('origin', origin);

      if (origin == 0) {
        let data = sideEventsProcessorContract.methods.setOrigin(this.config.rsk.bridge).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data, 0, this.config.eth.privateKey);
        let origin2 = await sideEventsProcessorContract.methods.origin().call();
        this.logger.info('origin', origin2);
      }
      
      let transferable = await sideEventsProcessorContract.methods.transferable().call();
      
      this.logger.info('transferable', transferable);

      if (transferable == 0) {
        let data = sideEventsProcessorContract.methods.setTransferable(this.config.eth.bridge).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data, 0, this.config.eth.privateKey);
        let transferable2 = await sideEventsProcessorContract.methods.transferable().call();
        this.logger.info('transferable', transferable2);
      }
      
      for(let log of logs) {
        this.logger.info('log', log);
        let rawBlockHeader = await rskWeb3.extended.getRawBlockHeaderByHash(log.blockHash);
        let rawTxReceipt = await rskWeb3.extended.getRawTransactionReceiptByHash(log.transactionHash);
        let txReceiptNode = await rskWeb3.extended.getTransactionReceiptNodesByHash(log.blockHash, log.transactionHash);
        txReceiptNode.unshift(rawTxReceipt);
        this.logger.info('nodes', txReceiptNode);
        let prefsuf = calculatePrefixesSuffixes(txReceiptNode);
        this.logger.info('prefixes', prefsuf.prefixes);
        this.logger.info('suffixes', prefsuf.suffixes);
        let rawTxReceiptNode = ethUtils.bufferToHex(RLP.encode(txReceiptNode));
        
        let txReceiptHash = Web3.utils.keccak256(rawTxReceipt);
        
        this.logger.info(`Start recordBlock for blockHash:${log.blockHash}, blockHash:${log.blockHash}`);
        let data = sideBlockRecorderContract.methods.recordBlock('0x' + rawBlockHeader).encodeABI();
        await transactionSender.sendTransaction(sideBlockRecorderContract.options.address, data, 0, this.config.eth.privateKey);

        this.logger.info(`Start processReceipt for transactionHash:${log.transactionHash}`);
        let data2 = sideEventsProcessorContract.methods.processReceipt(log.blockHash, '0x' + rawTxReceipt, prefsuf.prefixes, prefsuf.suffixes).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data2, 0, this.config.eth.privateKey);

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
