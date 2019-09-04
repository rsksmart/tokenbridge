const Web3 = require('web3');

const abiMMR = require('../../abis/MMR.json');
const TransactionSender = require('../../lib/TransactionSender.js');

module.exports = class RskMMR {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    async run() {
        try {
            let rskWeb3 = new Web3(this.config.rsk.host);
            let transactionSender = new TransactionSender(rskWeb3, this.logger);
            let mmrAddress = this.config.rsk.mmr;
            let mmrContract = new rskWeb3.eth.Contract(abiMMR, mmrAddress);
            await mmrContract.methods.calculate().call(); //Dry run
            let data = mmrContract.methods.calculate().encodeABI();
            await transactionSender.sendTransaction(mmrAddress, data, 0, this.config.rsk.privateKey);
            return true;
        } catch(err) {
            this.logger.error('Exception calling MMR.calculate()', err);
            process.exit();
        }
    }

}