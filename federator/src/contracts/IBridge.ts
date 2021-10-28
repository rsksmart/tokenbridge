import { Contract } from 'web3-eth-contract';

interface mappedTokensParams {
  originalTokenAddress: string;
}

export class IBridge {
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

  getPastEvents(eventName: string, options: any) {
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress() {
    return this.bridgeContract.options.address;
  }

  getProcessed(transactionHash: string) {
    return this.bridgeContract.methods.processed(transactionHash).call();
  }

  getVersion() {
    return this.bridgeContract.methods.version();
  }

  getMappedToken(paramsObj: mappedTokensParams) {
    return this.bridgeContract.methods.mappedTokens(paramsObj.originalTokenAddress);
  }
}
