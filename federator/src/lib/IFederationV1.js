module.exports = class IFederationV1 {
    constructor(config, fedContract) {
        this.federationContract = fedContract;
        this.config = config;
    }

    getTransactionId(paramsObj) {
        return this.federationContract.methods.getTransactionId(
            paramsObj.originalTokenAddress,
            paramsObj.receiver,
            paramsObj.amount,
            paramsObj.symbol,
            paramsObj.blockHash,
            paramsObj.transactionHash,
            paramsObj.logIndex,
            paramsObj.decimals,
            paramsObj.granularity
        );
    }
    
    transactionWasProcessed(txId) {
        return this.federationContract.methods.transactionWasProcessed(txId);
    }

    hasVoted(txId) {
        return this.federationContract.methods.hasVoted(txId);
    }
    
    voteTransaction(paramsObj) {
        return this.federationContract.methods.voteTransaction(
            paramsObj.originalTokenAddress,
            paramsObj.receiver,
            paramsObj.amount,
            paramsObj.symbol,
            paramsObj.blockHash,
            paramsObj.transactionHash,
            paramsObj.logIndex,
            paramsObj.decimals,
            paramsObj.granularity
        );
    } 

    getAddress() {
        return this.federationContract.options.address;
    }

    getPastEvents(eventName, options) {
        return this.federationContract.getPastEvents(
            eventName,
            options
        );
    } 

    async emitHeartbeat(...args) {
        // no-op [Federation V1 does not feature an `emitHearbeat`
        // function nor an Hearbeat event ]
    }
}