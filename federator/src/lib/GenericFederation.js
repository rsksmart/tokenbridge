const abiFederationOld = require('../../../abis/Federation_old.json');
const abiFederationNew = require('../../../abis/Federation.json');
const FederationInterfaceV1 = require('./IFederationV1.js');
const FederationInterfaceV2 = require('./IFederationV2.js');

module.exports = class GenericFederation {

    static async getVersion(federationContract) {
        try {
            return await federationContract.methods.version().call();
        } catch(err) {
            console.log(err);
            return "v1";
        }
    }

    static async getInstance(Constructor, ...args) {
        let federationContract = new Constructor(abiFederationNew, ...args);
        const version = await this.getVersion(federationContract);

        if (version === 'v2') {
            federationContract = new Constructor(abiFederationNew, ...args);
            return new FederationInterfaceV2(federationContract);
        } else {
            federationContract = new Constructor(abiFederationOld, ...args);
            return new FederationInterfaceV1(federationContract);
        }
    } 
}