import { Contract, EventData } from 'web3-eth-contract';
import { IBridge } from './IBridge';

interface MappedTokensParams {
  originalTokenAddress: string;
}

export class IBridgeV3 implements IBridge {
  bridgeContract: Contract;

  constructor(bridgeContract: Contract) {
    this.bridgeContract = bridgeContract;
  }

  getFederation(): Promise<string> {
    return this.bridgeContract.methods.getFederation();
  }

  getAllowedTokens(): Promise<string> {
    return this.bridgeContract.methods.allowedTokens();
  }

  getPastEvents(eventName: string, options: any): Promise<EventData[]> {
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.bridgeContract.options.address;
  }

  getProcessed(transactionHash: string): Promise<boolean> {
    return this.bridgeContract.methods.processed(transactionHash);
  }

  getVersion(): Promise<string> {
    return this.bridgeContract.methods.version();
  }

  getMappedToken(paramsObj: MappedTokensParams): Promise<string> {
    return this.bridgeContract.methods.mappedTokens(paramsObj.originalTokenAddress).call();
  }
}
