const abiAllowTokensOld = require('../../../abis/AllowTokens_old.json');
const abiAllowTokensNew = require('../../../abis/AllowTokens.json');
const abiBridge = require('../../../abis/Bridge.json');
const IAllowTokensV1 = require('./IAllowTokensV1');
const IAllowTokensV0 = require('./IAllowTokensV0');
const CustomError = require('../lib/CustomError');

module.exports = class AllowTokensFactory {
    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
    }

    async getVersion(allowTokensContract) {
        try {
            return await allowTokensContract.methods.version().call();
        } catch(err) {
            return 'v0';
        }
    }

    async createInstance(web3, address) {
        let allowTokensContract = new web3.eth.Contract(abiAllowTokensNew, address);
        const version = await this.getVersion(allowTokensContract);
        const chainId = await web3.eth.net.getId();

        if (version === 'v1') {
            return new IAllowTokensV1(allowTokensContract, chainId);
        } else if (version === 'v0') {
            allowTokensContract = new web3.eth.Contract(abiAllowTokensOld, address);
            return new IAllowTokensV0(allowTokensContract, chainId);
        } else {
            throw Error('Unknown AllowTokens contract version');
        }
    }

    async getMainAllowTokensContract() {
        try {
            const bridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
            const allowTokensAddress = await bridgeContract.methods.allowTokens().call();

            return await this.createInstance(
                this.mainWeb3,
                allowTokensAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Main AllowTokens Contract`, err);
        }
    }

    async getSideAllowTokensContract() {
        try {
            const bridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
            const allowTokensAddress = await bridgeContract.methods.allowTokens().call();

            return await this.createInstance(
                this.sideWeb3,
                allowTokensAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side AllowTokens Contract`, err);
        }
    }
}
