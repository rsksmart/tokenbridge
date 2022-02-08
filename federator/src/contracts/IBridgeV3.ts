import { Contract, EventData } from 'web3-eth-contract';
import { NEW_CHAIN_IDS } from '../lib/chainId';
import { VERSIONS } from './Constants';
import { IBridge } from './IBridge';

interface MappedTokensParams {
  originalTokenAddress: string;
}

export class IBridgeV3 implements IBridge {
  bridgeContract: Contract;
  chainId: number;

  constructor(bridgeContract: Contract, chainId: number) {
    this.bridgeContract = bridgeContract;
    this.chainId = chainId;
  }

  getFederation(): Promise<string> {
    return this.bridgeContract.methods.getFederation();
  }

  getAllowedTokens(): Promise<string> {
    return this.bridgeContract.methods.allowedTokens();
  }

  async getPastEvents(eventName: string, destinationChainId: number, options: any): Promise<EventData[]> {
    if (NEW_CHAIN_IDS.includes(this.chainId)) {
      // Binance and Ribkeby shouldn't cross events until the multichain bridge starts
      return [];
    }
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.bridgeContract.options.address;
  }

  getTransactionDataHash({ to, amount, blockHash, transactionHash, logIndex }): Promise<string> {
    return this.bridgeContract.methods.getTransactionDataHash(to, amount, blockHash, transactionHash, logIndex).call();
  }

  getProcessed(transactionDataHash: string): Promise<boolean> {
    return this.bridgeContract.methods.claimed(transactionDataHash).call();
  }

  getVersion(): string {
    return VERSIONS.V3;
  }

  getMappedToken(paramsObj: MappedTokensParams): Promise<string> {
    return this.bridgeContract.methods.mappedTokens(paramsObj.originalTokenAddress).call();
  }
}
