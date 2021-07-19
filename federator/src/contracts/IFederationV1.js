module.exports = class IFederationV1 {
    constructor(config, fedContract) {
        this.federationContract = fedContract;
        this.config = config;
    }

    getVersion() {
        return 'v1';
    }

    isMember(address) {
        return this.federationContract.methods.isMember(address);
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
        if(eventName === 'HeartBeat') {
            //Version 1 does not have a HeartBeat event
            return [];
        }
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