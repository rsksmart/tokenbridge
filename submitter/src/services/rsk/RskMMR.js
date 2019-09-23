const Web3 = require('web3');
const abiMMR = require('../../abis/MMR.json');
const TransactionSender = require('../../lib/TransactionSender.js');
const CustomError = require('../../lib/CustomError.js');

module.exports = class RskMMR {
    constructor(config, logger, mmrController) {
        this.config = config;
        this.logger = logger;
        this.mmrController = mmrController;

        this.rskWeb3 = new Web3(this.config.rsk.host);
    }

    async run() {
        try {
            let transactionSender = new TransactionSender(this.rskWeb3, this.logger);
            let mmrAddress = this.config.rsk.mmr;
            let mmrContract = new this.rskWeb3.eth.Contract(abiMMR, mmrAddress);
            await mmrContract.methods.calculate().call(); //Dry run
            let data = mmrContract.methods.calculate().encodeABI();
            await transactionSender.sendTransaction(mmrAddress, data, 0, this.config.rsk.privateKey);
            await this.mmrController.updateMMRTree();
            return true;
        } catch(err) {
            this.logger.error(new CustomError('Exception on calculating MMR', err));
            process.exit()
        }
    }

    async exitHandler() {
        try {
            this.mmrController.save();
        } catch(err) {
            this.logger.error(new CustomError('Exception on exitHandler', err));
        }
    }

    
}
