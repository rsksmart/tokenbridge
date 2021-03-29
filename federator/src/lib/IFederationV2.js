module.exports = class IFederationV2 {
    constructor(config, fedContract) {
        this.federationContract = fedContract;
        this.config = config;
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

    getPastEvents(eventName, options) {
        return this.federationContract.getPastEvents(
            eventName,
            options
        );
    }

    async emitHeartbeat(
        txSender,
        fedRskBlock,
        fedEthBlock,
        fedVSN,
        nodeRskInfo,
        nodeEthInfo
    ) {
        let txData = await this.federationContract.methods.emitHeartbeat(
            fedRskBlock,
            fedEthBlock,
            fedVSN,
            nodeRskInfo,
            nodeEthInfo
        ).encodeABI();

        await txSender.sendTransaction(this.getAddress(), txData, 0, this.config.privateKey);
    }

}
