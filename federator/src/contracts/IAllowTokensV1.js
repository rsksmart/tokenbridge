const CustomError = require('../lib/CustomError');

module.exports = class IAllowTokensV1 {
    constructor(allowTokensContract) {
        this.allowTokensContract = allowTokensContract;
        this.mapTokenInfoAndLimits = {};
    }

    getVersion() {
        return 'v1';
    }

    async getConfirmations() {
        let promises = [];
        promises.push(this.getSmallAmountConfirmations());
        promises.push(this.getMediumAmountConfirmations());
        promises.push(this.getLargeAmountConfirmations());
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
                const infoAndLimits = await this.allowTokensContract.methods.getInfoAndLimits(tokenAddress).call();
                result = {
                    allowed: infoAndLimits.info.allowed,
                    mediumAmount: infoAndLimits.limit.mediumAmount,
                    largeAmount: infoAndLimits.limit.largeAmount,
                };
                if (result.allowed) {
                    this.mapTokenInfoAndLimits[tokenAddress] = result;
                }
            }
            return result;
        } catch(err) {
            throw new CustomError(`Exception getInfoAndLimits at AllowTokens Contract`, err);
        }
    }
}
