const abiBridgeOld = require('../../../abis/Bridge_old.json');
const abiBridgeNew = require('../../../abis/Bridge.json');
const BridgeInterface = require('./IBridge.js');
const CustomError = require('../lib/CustomError');

module.exports = class BridgeFactory {

    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
    }

    async createInstance(web3, address) {
        let bridgeContract = new web3.eth.Contract(abiBridgeOld, address);
        const version = await bridgeContract.methods.version().call()
        if (version === 'v3') {
            bridgeContract = new web3.eth.Contract(abiBridgeNew, address);
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