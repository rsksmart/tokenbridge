const Web3 = require('web3');
const fs = require('fs');
//abi
const abiBridge = require('../../abis/Bridge.json');
const abiBlockRecorder = require('../../abis/BlockRecorder.json');
const abiEventsProcessor = require('../../abis/EventsProcessor.json');
const abiMMRProver = require('../../abis/MMRProver.json');
//lib
const utils = require('../../lib/utils.js');
const TransactionSender = require('../../lib/TransactionSender.js');
const CustomError = require('../../lib/CustomError.js');

module.exports = class RskCrossToEth {
  constructor(config, logger, mmrController) {
    this.config = config;
    this.logger = logger;
    this.mmrController = mmrController;
    this.lastBlockPath = `${config.storagePath || __dirname}/lastBlock.txt`;
  }

  async run(waitForConfirmations) {
    try {
      let ethWeb3 = new Web3(this.config.eth.host);
      let rskWeb3 = this._getRskWeb3Extended();

      if(waitForConfirmations) {
        const numberOfBlocks = this.config.confirmations;
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
      const sideMMRProverContract = new ethWeb3.eth.Contract(abiMMRProver, this.config.eth.mmrProver);
      const sideEventsProcessorContract = new ethWeb3.eth.Contract(abiEventsProcessor, this.config.eth.eventsProcessor);
      const bridgeContract = new rskWeb3.eth.Contract(abiBridge, this.config.rsk.bridge);

      const transactionSender = new TransactionSender(ethWeb3, this.logger);
      const from = await transactionSender.getAddress(this.config.eth.privateKey);
      this.logger.debug('use sender address', from);
      
      let fromBlock = null;
      try {
        fromBlock = fs.readFileSync(this.lastBlockPath, 'utf8');
      } catch(err) {
        fromBlock = this.config.rsk.fromBlock;
      }
      fromBlock++;
      this.logger.debug('run from Block', fromBlock);

      const logs = await bridgeContract.getPastEvents( "Cross", {
        fromBlock: fromBlock || "0x01",
        toBlock: toBlock || "latest"
      });
      this.logger.info(`Found ${logs.length} logs`);
      
      let origin = await sideEventsProcessorContract.methods.origin().call();
      this.logger.debug('origin', origin);
      if (origin == 0) {
        //TODO this should be made at deploy
        let data = sideEventsProcessorContract.methods.setOrigin(this.config.rsk.bridge).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data, 0, this.config.eth.privateKey);
        origin = await sideEventsProcessorContract.methods.origin().call();
        this.logger.info('setted new origin', origin);
      }
      
      let transferable = await sideEventsProcessorContract.methods.transferable().call();
      this.logger.debug('transferable', transferable);
      if (transferable == 0) {
        //TODO this should be made at deploy
        let data = sideEventsProcessorContract.methods.setTransferable(this.config.eth.bridge).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data, 0, this.config.eth.privateKey);
        transferable = await sideEventsProcessorContract.methods.transferable().call();
        this.logger.info('setted new transferable', transferable);
      }

      let initialBlock = await sideMMRProverContract.methods.initialBlock().call();
      this.logger.debug('initialBlock', initialBlock);
      if (initialBlock == 0) {
        //TODO this should be made at deploy
        let data = sideMMRProverContract.methods.setInitialBlock(this.config.rsk.fromBlock).encodeABI();
        await transactionSender.sendTransaction(sideMMRProverContract.options.address, data, 0, this.config.eth.privateKey);
        initialBlock = await sideMMRProverContract.methods.initialBlock().call();
        this.logger.info('setted new initialBlock', initialBlock);
      }

      var previousBlockNumber = null;
      for(let log of logs) {
        this.logger.info('log', log);

        if(previousBlockNumber != log.blockNumber) {
          this.logger.info(`Start recordBlock for blockNumber:${log.blockNumber} blockHash:${log.blockHash}`);
          let rawBlockHeader = await rskWeb3.rsk.getRawBlockHeaderByHash(log.blockHash);
          let data = sideBlockRecorderContract.methods.recordBlock(rawBlockHeader).encodeABI();
          await transactionSender.sendTransaction(sideBlockRecorderContract.options.address, data, 0, this.config.eth.privateKey);
         
          let mmrRoot = this.mmrController.mmrTree.getRoot();
          this.logger.debug(`Start initProcessProof for blockNumber:${log.blockNumber} blockHash:${log.blockHash} mmrRoot:${mmrRoot}`);
          data = sideMMRProverContract.methods.initProcessProof(log.blockNumber, log.blockHash, mmrRoot.hash).encodeABI();
          await transactionSender.sendTransaction(sideMMRProverContract.options.address, data, 0, this.config.eth.privateKey);

          let blocksToProve = await sideMMRProverContract.methods.getBlocksToProve(log.blockHash, log.blockNumber).call();
          this.logger.debug('sideMMRProverContract getBlocksToProve',log.blockHash, log.blockNumber, blocksToProve);
          for(var blockToProve of blocksToProve) {
            this.logger.info(`Start to prove block:${blockToProve}`);
            let mmrLeaf = this.mmrController.mmrTree.getLeaf(blockToProve);
            if(!mmrLeaf) {
              this.logger.error(`Couldnt find mmrLeaf in the MMR Tree for block:${blockToProve}`);
              throw new Error(`Couldnt find mmrLeaf in the MMR Tree for block:${blockToProve}`);
            }
            let mmrPrefsuf = this.mmrController.mmrTree.getPrefixesSuffixesProof(blockToProve);

            let result = await sideMMRProverContract.methods.mmrIsValid(mmrRoot.hash, mmrLeaf.hash, mmrPrefsuf.prefixes, mmrPrefsuf.suffixes).call();            
            if(!result) {
              this.logger.error(`MMR Root is not valid blockToProve:${blockToProve} mmrRoot:${mmrRoot.hash} initial:${mmrLeaf.hash} prefixes:${mmrPrefsuf.prefixes} suffixes:${mmrPrefsuf.suffixes}`);
              throw new Error('MMR Root is not valid blockToProve');
            }

            this.logger.debug(`Start processBlockProof blockToProve:${blockToProve} mmrRoot:${mmrRoot.hash} initial:${mmrLeaf.hash} prefixes:${mmrPrefsuf.prefixes} suffixes:${mmrPrefsuf.suffixes} for blockNumber:${log.blockNumber} blockHash:${log.blockHash}`);
            let data = sideMMRProverContract.methods.processBlockProof(log.blockNumber, log.blockHash, mmrRoot.hash, blockToProve, mmrLeaf.hash, mmrPrefsuf.prefixes, mmrPrefsuf.suffixes).encodeABI();
            await transactionSender.sendTransaction(sideMMRProverContract.options.address, data, 0, this.config.eth.privateKey);
          }
          
          // let status = await sideMMRProverContract.methods.getProofStatus(log.blockNumber, log.blockHash, mmrRoot.hash);
          // this.logger.error('Status',status);
          // if(status.blocksToProve.length != status.proved.length) {
          //   this.logger.error(`Not all blocks where proved, expected ${status.blocksToProve.lenght} but got ${status.proved.length}`);
          //   process.exit();
          // }

          let blockData = await sideBlockRecorderContract.methods.blockData(log.blockHash).call();
          if(blockData.receiptRoot == utils.zeroHash || blockData.mmrRoot == utils.zeroHash) {
            this.logger.error('Block without mmrRoot or receiptRoot', blockData);
            throw new Error('Block without mmrRoot or receiptRoot');
          }

          previousBlockNumber = log.blockNumber;
        }

        let rawTxReceipt = await rskWeb3.rsk.getRawTransactionReceiptByHash(log.transactionHash);
        let txReceiptNode = await rskWeb3.rsk.getTransactionReceiptNodesByHash(log.blockHash, log.transactionHash);
        txReceiptNode.unshift(rawTxReceipt);
        this.logger.debug('txReceiptNode', txReceiptNode);
        let prefsuf = utils.calculatePrefixesSuffixes(txReceiptNode);
        this.logger.debug('prefixes', prefsuf.prefixes);
        this.logger.debug('suffixes', prefsuf.suffixes);
        
        this.logger.info(`Start processReceipt for transactionHash:${log.transactionHash} blockNumber:${log.blockNumber} blockHash:${log.blockHash}`);
        let data2 = sideEventsProcessorContract.methods.processReceipt(log.blockHash, rawTxReceipt, prefsuf.prefixes, prefsuf.suffixes).encodeABI();
        await transactionSender.sendTransaction(sideEventsProcessorContract.options.address, data2, 0, this.config.eth.privateKey);
      }

      fs.writeFileSync(this.lastBlockPath, previousBlockNumber);
      return true;
    } catch (err) {
        this.logger.error(new CustomError('Exception Crossing RSK Event', err));
        process.exit();
    }

  }

  _getRskWeb3Extended() {
    let rskWeb3 = new Web3(this.config.rsk.host);
    rskWeb3.extend({
      property: 'rsk',
      methods: [
        {
          name: 'getTransactionReceiptNodesByHash',
          call: 'rsk_getTransactionReceiptNodesByHash',
          params: 2
        },
        {
          name: 'getRawTransactionReceiptByHash',
          call: 'rsk_getRawTransactionReceiptByHash',
          params: 1
        },
        {
          name: 'getRawBlockHeaderByHash',
          call: 'rsk_getRawBlockHeaderByHash',
          params: 1
        },
        {
          name: 'getRawBlockHeaderByNumber',
          call: 'rsk_getRawBlockHeaderByNumber',
          params: 1,
          inputFormatter: [rskWeb3.extend.formatters.inputDefaultBlockNumberFormatter]
        }
      ]
    });
    return rskWeb3;
  }

}
