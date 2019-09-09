const Web3 = require('web3');

const abiBridge = require('../../abis/Bridge.json');
const TransactionSender = require('../../lib/TransactionSender.js');

module.exports = class RskToEth {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
}

  async run() {
    try {
        let rskWeb3 = new Web3(this.config.rsk.host);
        let transactionSender = new TransactionSender(rskWeb3, this.logger);
        let bridgeAddress = this.config.rsk.bridge;
        let bridgeContract = new rskWeb3.eth.Contract(abiBridge, bridgeAddress);
        let result = await bridgeContract.methods.emitEvent().call();
        if(result) {
          this.logger.info('Preparing to emit the cross event');
          let data = bridgeContract.methods.emitEvent().encodeABI();
          await transactionSender.sendTransaction(bridgeAddress, data, 0, this.config.rsk.privateKey);
          return true;
        } else {
          this.logger.debug('Conditions not met to emmit the event');
          return false;
        }
    } catch(err) {
        this.logger.error('Exception Creating RSK Event', err);
        process.exit()
    }
  }

}
