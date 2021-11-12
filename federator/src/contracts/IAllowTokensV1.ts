import { Contract } from 'web3-eth-contract';
import CustomError from '../lib/CustomError';
import { VERSIONS } from './Constants';

interface GetLimitsParams {
  tokenAddress: string;
}

export class IAllowTokensV1 {
  allowTokensContract: Contract;
  mapTokenInfoAndLimits: any;
  chainId: number;

  constructor(allowTokensContract: Contract, chainId: number) {
    this.allowTokensContract = allowTokensContract;
    this.mapTokenInfoAndLimits = {};
    this.chainId = chainId;
  }

  getVersion() {
    return VERSIONS.V1;
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

  async getLimits(objParams: GetLimitsParams) {
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
