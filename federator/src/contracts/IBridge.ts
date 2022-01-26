import { Contract, EventData } from 'web3-eth-contract';

export interface IBridge {
  bridgeContract: Contract;

  getFederation();

  getAllowedTokens();

  getPastEvents(eventName: string, options: any): Promise<EventData[]>;

  getAddress(): string;

  getProcessed(transactionHash: string);

  getVersion();

  getMappedToken(paramsObj: any): Promise<string>;
}
