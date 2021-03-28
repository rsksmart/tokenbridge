module.exports = class IBridge {
    constructor(bridgeContract) {
        this.bridgeContract = bridgeContract;
    }

    async getFederation() {
        return this.bridgeContract.methods.getFederation().call();
    }

    async getPastEvents(eventName, options) {
        return this.bridgeContract.getPastEvents(
            eventName,
            options
        );
    }

    getAddress() {
        return this.bridgeContract.options.address;
    }

    async getProcessed(txId) {
        return this.bridgeContract.methods.processed(txId).call();
    }
}