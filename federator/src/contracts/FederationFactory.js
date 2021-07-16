const abiFederationOld = require('../../../abis/Federation_old.json');
const abiFederationNew = require('../../../abis/Federation.json');
const abiBridge = require('../../../abis/Bridge.json');
const FederationInterfaceV1 = require('./IFederationV1.js');
const FederationInterfaceV2 = require('./IFederationV2.js');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');

module.exports = class FederationFactory {

    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
    }

    async createInstance(web3, address) {
        let federationContract = new web3.eth.Contract(abiFederationNew, address);
        const version = await this.getVersion(federationContract);

        if (version === 'v2') {
            federationContract = new web3.eth.Contract(abiFederationNew, address);
            return new FederationInterfaceV2(this.config, federationContract);
        } else if (version === 'v1') {
            federationContract = new web3.eth.Contract(abiFederationOld, address);
            return new FederationInterfaceV1(this.config, federationContract);
        } else {
            throw Error('Unknown Federation contract version');
        }
    }

    async getVersion(federationContract) {
        try {
            return await utils.retry3Times(federationContract.methods.version().call);
        } catch(err) {
            return "v1";
        }
    }

    async getMainFederationContract() {
        try {
            const bridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
            const federationAddress = await utils.retry3Times(bridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.mainWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Main Federation Contract`, err);
        }
    }

    async getSideFederationContract() {
        try {
            const bridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
            const federationAddress = await utils.retry3Times(bridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.sideWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side Federation Contract`, err);
        }
    }
}
