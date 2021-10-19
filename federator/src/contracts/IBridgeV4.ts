import { Contract } from 'web3-eth-contract';

export class IBridgeV4 {
  bridgeContract: Contract;
  constructor(bridgeContract: Contract) {
    this.bridgeContract = bridgeContract;
  }

  getFederation() {
    return this.bridgeContract.methods.getFederation();
  }

  getAllowedTokens() {
    return this.bridgeContract.methods.allowedTokens();
  }

  getPastEvents(eventName: any, options: any) {
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress() {
    return this.bridgeContract.options.address;
  }

  getProcessed(transactionHash: any) {
    return this.bridgeContract.methods.claimed(transactionHash).call();
  }

  getVersion() {
    return this.bridgeContract.methods.version();
  }

  getMappedToken(chainId: number, originalTokenAddress: string) {
    return this.bridgeContract.methods.sideTokenAddressByOriginalTokenAddress(chainId, originalTokenAddress);
  }
}
