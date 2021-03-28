const CustomError = require('./CustomError');

module.exports = class IAllowTokensV1 {
    constructor(allowTokensContract) {
        this.allowTokensContract = allowTokensContract;
        this.mapTokenInfoAndLimits = {};
    }

    async getConfirmations() {
        promises = [];
        promises.push(getSmallAmountConfirmations());
        promises.push(getMediumAmountConfirmations());
        promises.push(getLargeAmountConfirmations());
        const result = await Promise.all(promises);
        return {
            smallAmountConfirmations: result[0],
            mediumAmountConfirmations: result[1],
            largeAmountConfirmations: result[2],
        }
    }

    async getSmallAmountConfirmations() {
        try {
            return this.allowTokensContract.methods.smallAmountConfirmations().call();
        } catch(err) {
            throw new CustomError(`Exception getSmallAmountConfirmations at AllowTokens Contract`, err);
        }
    }

    async getMediumAmountConfirmations() {
        try {
            return this.allowTokensContract.methods.mediumAmountConfirmations().call();
        } catch(err) {
            throw new CustomError(`Exception getMediumAmountConfirmations at AllowTokens Contract`, err);
        }
    }

    async getLargeAmountConfirmations() {
        try {
            return this.allowTokensContract.methods.largeAmountConfirmations().call();
        } catch(err) {
            throw new CustomError(`Exception getLargeAmountConfirmations at AllowTokens Contract`, err);
        }
    }

    async getLimits(tokenAddress) {
        try {
            let result = this.mapTokenInfoAndLimits[tokenAddress];
            if(!result) {
                const infoAndLimits = await  this.bridgeContract.methods.getTokenInfoAndLimits(tokenAddress).call();
                result = {
                    mediumAmount: infoAndLimits.limit.mediumAmount,
                    largeAmount: infoAndLimits.limit.largeAmount,
                };
                this.mapTokenInfoAndLimits[tokenAddress] = result;
            }
            return result;
        } catch(err) {
            throw new CustomError(`Exception getTokenInfoAndLimits at AllowTokens Contract`, err);
        }
    }
}