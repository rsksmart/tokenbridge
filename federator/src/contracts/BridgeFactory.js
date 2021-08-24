const abiBridgeOld = require('../../../bridge/abi/Bridge_old.json');
const abiBridgeNew = require('../../../bridge/abi/Bridge.json');
const BridgeInterface = require('./IBridge.js');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');
const ContractFactory = require('./ContractFactory');

module.exports = class BridgeFactory extends ContractFactory {

    constructor(config, logger, Web3) {
        super(config, logger, Web3);
    }

    async getVersion(bridgeContract) {
        return utils.retry3Times(bridgeContract.methods.version().call)
    }

    async createInstance(web3, address) {
        let bridgeContract = this.getContractByAbi(abiBridgeOld, address, web3);
        const version = await this.getVersion(bridgeContract);
        if (version === 'v3') {
            bridgeContract = this.getContractByAbi(abiBridgeNew, address, web3);
        } else if (!['v2', 'v1'].includes(version)) {
            throw Error('Unknown Bridge contract version');
        }
        return new BridgeInterface(bridgeContract);
    }

    async getMainBridgeContract() {
        try {
            return await this.createInstance(
                this.mainWeb3,
                this.config.mainchain.bridge
            );
        } catch (err) {
            throw new CustomError(`Exception creating Main Bridge Contract`, err);
        }
    }

    async getSideBridgeContract() {
        try {
            return await this.createInstance(
                this.sideWeb3,
                this.config.sidechain.bridge
            );
        } catch (err) {
            throw new CustomError(`Exception creating Side Bridge Contract`, err);
        }
    }
}