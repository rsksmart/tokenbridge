const abiBridgeOld = require('../../../abis/Bridge_old.json');
const abiBridgeNew = require('../../../abis/Bridge.json');
const BridgeInterface = require('./IBridge.js');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');

module.exports = class BridgeFactory {

    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
    }

    async getVersion(bridgeContract) {
        return utils.retry3Times(bridgeContract.methods.version().call)
    }

    async createInstance(web3, address) {
        let bridgeContract = new web3.eth.Contract(abiBridgeOld, address);
        const version = await this.getVersion(bridgeContract);
        if (version === 'v3') {
            bridgeContract = new web3.eth.Contract(abiBridgeNew, address);
        } else if (!['v2','v1'].includes(version)) {
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
        } catch(err) {
            throw new CustomError(`Exception creating Main Bridge Contract`, err);
        }
    }

    async getSideBridgeContract() {
        try {
            return await this.createInstance(
                this.sideWeb3,
                this.config.sidechain.bridge
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side Bridge Contract`, err);
        }
    }
}