module.exports = class IAllowTokensV0 {
    constructor(allowTokensContract, chainId) {
        this.allowTokensContract = allowTokensContract;
        this.mapTokenInfoAndLimits = {};
        this.chainId = chainId;
    }

    getVersion() {
        return 'v0';
    }

    async getConfirmations() {
        let confirmations = 0; //for rsk regtest and ganache
        if (this.chainId == 31 || this.chainId == 42) { // rsk testnet and kovan
            confirmations = 10
        }
        if (this.chainId == 1) { //ethereum mainnet 24hs
            confirmations = 5760
        }
        if (this.chainId == 30) { // rsk mainnet 24hs
            confirmations = 2880
        }
        return {
            smallAmountConfirmations: confirmations,
            mediumAmountConfirmations: confirmations,
            largeAmountConfirmations: confirmations,
        }
    }


    async getLimits(tokenAddress) {
        return {
            mediumAmount: -1,
            largeAmount: 0,
        };
    }
}
