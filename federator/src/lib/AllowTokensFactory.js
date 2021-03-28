const abiAllowTokensOld = require('../../../abis/AllowTokens_old.json');
const abiAllowTokensNew = require('../../../abis/AllowTokens.json');
const IAllowTokensV1 = require('./IAllowTokensV1.js');
const IAllowTokensV0 = require('./IAllowTokensV0.js').default;
const CustomError = require('./CustomError');

module.exports = class AllowTokensFactory {

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }


    async createInstance(web3, address) {
        try {
            let allowTokensContract = new web3.eth.Contract(abiAllowTokensNew, address);
            let version = 'v0';
            try {
                version = await allowTokensContract.methods.version().call();
                return new IAllowTokensV1(allowTokensContract);
            } catch (err) {
                this.logger.debug('AllowTokens contract does not support version method');
                allowTokensContract = new web3.eth.Contract(abiAllowTokensOld, address);
                return new IAllowTokensV0(allowTokensContract);
            }
        } catch (err) {
            throw new CustomError(`Exception creating AllowTokens Contract`, err);
        }
    }
}