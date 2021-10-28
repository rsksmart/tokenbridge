import { Contract } from 'web3-eth-contract';
import CustomError from '../lib/CustomError';
import { V1 } from './Constants';

export class IAllowTokensV1 {
  allowTokensContract: Contract;
  mapTokenInfoAndLimits: any;

  constructor(allowTokensContract: Contract) {
    this.allowTokensContract = allowTokensContract;
    this.mapTokenInfoAndLimits = {};
  }

  getVersion() {
    return V1;
  }

  async getConfirmations() {
    const promises = [];
    promises.push(this.getSmallAmountConfirmations());
    promises.push(this.getMediumAmountConfirmations());
    promises.push(this.getLargeAmountConfirmations());
    const result = await Promise.all(promises);
    return {
      smallAmountConfirmations: result[0],
      mediumAmountConfirmations: result[1],
      largeAmountConfirmations: result[2],
    };
  }

  async getSmallAmountConfirmations() {
    try {
      return this.allowTokensContract.methods.smallAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getSmallAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getMediumAmountConfirmations() {
    try {
      return this.allowTokensContract.methods.mediumAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getMediumAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getLargeAmountConfirmations() {
    try {
      return this.allowTokensContract.methods.largeAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getLargeAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getLimits(objParams: any) {
    try {
      let result = this.mapTokenInfoAndLimits[objParams.tokenAddress];
      if (!result) {
        const infoAndLimits = await this.allowTokensContract.methods.getInfoAndLimits(objParams.tokenAddress).call();
        result = {
          allowed: infoAndLimits.info.allowed,
          mediumAmount: infoAndLimits.limit.mediumAmount,
          largeAmount: infoAndLimits.limit.largeAmount,
        };
        if (result.allowed) {
          this.mapTokenInfoAndLimits[objParams.tokenAddress] = result;
        }
      }
      return result;
    } catch (err) {
      throw new CustomError(`Exception getInfoAndLimits at AllowTokens Contract`, err);
    }
  }
}
