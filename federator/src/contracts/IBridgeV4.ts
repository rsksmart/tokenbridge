import { Contract } from 'web3-eth-contract';

interface SideTokenAddressByOriginalTokenInterface {
  originalTokenAddress: string;
  chainId: number;
}

export class IBridgeV4 {
  bridgeContract: Contract;
  chainId: number;

  constructor(bridgeContract: Contract, chainId: number) {
    this.bridgeContract = bridgeContract;
    this.chainId = chainId;
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

  getMappedToken(paramsObj: SideTokenAddressByOriginalTokenInterface) {
    return this.bridgeContract.methods.sideTokenByOriginalToken(paramsObj.chainId, paramsObj.originalTokenAddress);
  }
}
