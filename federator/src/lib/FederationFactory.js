const abiFederationOld = require('../../../abis/Federation_old.json');
const abiFederationNew = require('../../../abis/Federation.json');
const FederationInterfaceV1 = require('./IFederationV1.js');
const FederationInterfaceV2 = require('./IFederationV2.js');
const CustomError = require('./CustomError');

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
            return new FederationInterfaceV2(federationContract);
        } else {
            federationContract = new web3.eth.Contract(abiFederationOld, address);
            return new FederationInterfaceV1(federationContract);
        }
    }

    async getVersion(federationContract) {
        try {
            return await federationContract.methods.version().call();
        } catch(err) {
            console.log(err);
            return "v1";
        }
    }

    async getSideFederationContract() {
        try {
            return await this.createInstance(
                this.sideWeb3,
                this.config.sidechain.federation
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side Federation Contract`, err);
        }
    } 
}
