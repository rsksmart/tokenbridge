module.exports = class IFederationV2 {
    constructor(config, fedContract) {
        this.federationContract = fedContract;
        this.config = config;
    }

    getVersion() {
        return 'v2';
    }

    isMember(address) {
        return this.federationContract.methods.isMember(address);
    }

    getTransactionId(paramsObj) {

        return this.federationContract.methods.getTransactionId(
            paramsObj.originalTokenAddress,
            paramsObj.sender,
            paramsObj.receiver,
            paramsObj.amount,
            paramsObj.blockHash,
            paramsObj.transactionHash,
            paramsObj.logIndex
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
            paramsObj.sender,
            paramsObj.receiver,
            paramsObj.number,
            paramsObj.blockHash,
            paramsObj.transactionHash,
            paramsObj.logIndex,
            paramsObj.tokenType,
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
