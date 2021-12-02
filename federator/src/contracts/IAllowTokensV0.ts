import { Contract } from 'web3-eth-contract';
import { VERSIONS } from './Constants';

export interface ConfirmationsReturn {
  smallAmountConfirmations: number;
  mediumAmountConfirmations: number;
  largeAmountConfirmations: number;
}

export class IAllowTokensV0 {
  allowTokensContract: Contract;
  mapTokenInfoAndLimits: any;
  chainId: any;

  constructor(allowTokensContract: Contract, chainId: number) {
    this.allowTokensContract = allowTokensContract;
    this.mapTokenInfoAndLimits = {};
    this.chainId = chainId;
  }

  getVersion() {
    return VERSIONS.V0;
  }

  async getConfirmations() {
    let confirmations = 0; //for rsk regtest and ganache
    if (this.chainId === 31 || this.chainId === 42) {
      // rsk testnet and kovan
      confirmations = 10;
    }
    if (this.chainId === 1) {
      //ethereum mainnet 24hs
      confirmations = 240;
    }
    if (this.chainId === 30) {
      // rsk mainnet 24hs
      confirmations = 120;
    }
    return {
      smallAmountConfirmations: confirmations,
      mediumAmountConfirmations: confirmations,
      largeAmountConfirmations: confirmations,
    };
  }

  async getLimits() {
    return {
      allowed: true,
      mediumAmount: -1,
      largeAmount: 0,
    };
  }
}
