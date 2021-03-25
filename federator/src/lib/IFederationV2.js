module.exports = class IFederationV2 {
    constructor(fedContract) {
        this.federationContract = fedContract;
    }

    getTransactionId(paramsObj = {}) {
        const {
            originalTokenAddress
        } = paramsObj;

        delete paramsObj.originalTokenAddress;

        return this.federationContract.methods.getTransactionId(
            originalTokenAddress,
            paramsObj
        );
    }

    transactionWasProcessed(txId) {
        return this.federationContract.methods.transactionWasProcessed(txId);
    }

    hasVoted(txId) {
        return this.federationContract.methods.hasVoted(txId);
    }
    
    voteTransaction(paramsObj = {}) {
        const {
            originalTokenAddress
        } = paramsObj;

        delete paramsObj.originalTokenAddress;
        
        return this.federationContract.methods.voteTransaction(
            originalTokenAddress,
            paramsObj
        );
    }

    getAddress() {
        return this.federationContract.options.address;
    }
}