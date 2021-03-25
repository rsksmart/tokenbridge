module.exports = class IFederationV1 {
    constructor(fedContract) {
        this.federationContract = fedContract;
    }

    getTransactionId(paramsObj = {}) {
        delete paramsObj.sender;

        return this.federationContract.methods.getTransactionId(
            ...Object.values(paramsObj)
        );
    }
    
    transactionWasProcessed(txId) {
        return this.federationContract.methods.transactionWasProcessed(txId);
    }

    hasVoted(txId) {
        return this.federationContract.methods.hasVoted(txId);
    }
    
    voteTransaction(paramsObj = {}) {
        return this.federationContract.methods.voteTransaction(
            ...Object.values(paramsObj)
        );
    } 

    getAddress() {
        return this.federationContract.options.address;
    }
}