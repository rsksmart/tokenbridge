import { Contract, EventData } from 'web3-eth-contract';
import { IBridge } from './IBridge';

interface SideTokenAddressByOriginalTokenInterface {
  originalTokenAddress: string;
  chainId: number;
}

export class IBridgeV4 implements IBridge {
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

  getPastEvents(eventName: string, options: any): Promise<EventData[]> {
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.bridgeContract.options.address;
  }

  getProcessed(transactionHash: string): Promise<boolean> {
    return this.bridgeContract.methods.claimed(transactionHash);
  }

  getVersion() {
    return this.bridgeContract.methods.version();
  }

  getMappedToken(paramsObj: SideTokenAddressByOriginalTokenInterface) {
    return this.bridgeContract.methods.sideTokenByOriginalToken(paramsObj.chainId, paramsObj.originalTokenAddress);
  }
}
