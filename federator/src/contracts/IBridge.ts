import { Contract, EventData } from 'web3-eth-contract';

export interface IBridge {
  bridgeContract: Contract;

  getFederation();

  getAllowedTokens();

  getPastEvents(eventName: string, destinationChainId: number, options: any): Promise<EventData[]>;

  getAddress(): string;

  getProcessed(transactionDataHash: string);

  getVersion(): Promise<string>;

  getTransactionDataHash({
    to,
    amount,
    blockHash,
    transactionHash,
    logIndex,
    originChainId,
    destinationChainId,
  }): Promise<string>;

  getMappedToken(paramsObj: any): Promise<string>;
}
