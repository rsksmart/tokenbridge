module.exports = class IBridge {
    constructor(bridgeContract) {
        this.bridgeContract = bridgeContract;
    }

    getFederation() {
        return this.bridgeContract.methods.getFederation();
    }

    getAllowedTokens() {
        return this.bridgeContract.methods.allowedTokens();
    }

    getPastEvents(eventName, options) {
        return this.bridgeContract.getPastEvents(
            eventName,
            options
        );
    }

    getAddress() {
        return this.bridgeContract.options.address;
    }

    getProcessed(transactionHash) {
        return this.bridgeContract.methods.processed(transactionHash).call();
    }

    getVersion() {
        return this.bridgeContract.methods.version();
    }

    getMappedToken(originalTokenAddress) {
        return this.bridgeContract.methods.mappedTokens(originalTokenAddress);
    }
}