module.exports = class IFederationV2 {
    constructor(config, fedContract) {
        this.federationContract = fedContract;
        this.config = config;
    }

    getTransactionId(paramsObj) {

        return this.federationContract.methods.getTransactionId(
            paramsObj.originalTokenAddress,
            {
                sender: paramsObj.sender,
                receiver: paramsObj.receiver,
                amount: paramsObj.amount,
                symbol: paramsObj.symbol,
                blockHash: paramsObj.blockHash,
                transactionHash: paramsObj.transactionHash,
                logIndex: paramsObj.logIndex,
                decimals: paramsObj.decimals,
                granularity: paramsObj.granularity,
                typeId: paramsObj.typeId,
            }
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
            {
                sender: paramsObj.sender,
                receiver: paramsObj.receiver,
                amount: paramsObj.amount,
                symbol: paramsObj.symbol,
                blockHash: paramsObj.blockHash,
                transactionHash: paramsObj.transactionHash,
                logIndex: paramsObj.logIndex,
                decimals: paramsObj.decimals,
                granularity: paramsObj.granularity,
                typeId: paramsObj.typeId,
            }
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
