const abiAllowTokensOld = require('../../../abis/AllowTokens_old.json');
const abiAllowTokensNew = require('../../../abis/AllowTokens.json');
const abiBridge = require('../../../abis/Bridge.json');
const IAllowTokensV1 = require('./IAllowTokensV1');
const IAllowTokensV0 = require('./IAllowTokensV0');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');
const ContractFactory = require('./ContractFactory');

module.exports = class AllowTokensFactory extends ContractFactory {
    constructor(config, logger, Web3) {
        super(config, logger, Web3);
        this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
        this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
    }

    async getVersion(allowTokensContract) {
        try {
            return await utils.retry3Times(allowTokensContract.methods.version().call);
        } catch (err) {
            return 'v0';
        }
    }

    async createInstance(web3, address) {
        let allowTokensContract = this.getContractByAddressAndAbi(abiAllowTokensNew, address, web3);
        const version = await this.getVersion(allowTokensContract);
        const chainId = await utils.retry3Times(web3.eth.net.getId);
        if (version === 'v1') {
            return new IAllowTokensV1(allowTokensContract, chainId);
        } else if (version === 'v0') {
            allowTokensContract = this.getContractByAddressAndAbi(abiAllowTokensOld, address, web3);
            return new IAllowTokensV0(allowTokensContract, chainId);
        } else {
            throw Error('Unknown AllowTokens contract version');
        }
    }

    async getMainAllowTokensContract() {
        try {
            const allowTokensAddress = await utils.retry3Times(this.mainChainBridgeContract.methods.allowTokens().call);
            return await this.createInstance(
                this.mainWeb3,
                allowTokensAddress
            );
        } catch (err) {
            throw new CustomError(`Exception creating Main AllowTokens Contract`, err);
        }
    }

    async getSideAllowTokensContract() {
        try {
            const allowTokensAddress = await utils.retry3Times(this.sideChainBridgeContract.methods.allowTokens().call);
            return await this.createInstance(
                this.sideWeb3,
                allowTokensAddress
            );
        } catch (err) {
            throw new CustomError(`Exception creating Side AllowTokens Contract`, err);
        }
    }
}
