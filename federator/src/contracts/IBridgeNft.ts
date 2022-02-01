import { Contract, EventData } from 'web3-eth-contract';
import { IBridge } from './IBridge';

export class IBridgeNft implements IBridge {
  bridgeContract: Contract;

  constructor(nftBridgeContract: any) {
    this.bridgeContract = nftBridgeContract;
  }
  getAllowedTokens() {
    throw new Error('Method not implemented.');
  }

  getFederation() {
    return this.bridgeContract.methods.getFederation();
  }

  getPastEvents(eventName: string, destinationChainId: number, options: any): Promise<EventData[]> {
    options._destinationChainId = destinationChainId;
    return this.bridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.bridgeContract.options.address;
  }

  getTransactionDataHash({
    to,
    amount,
    blockHash,
    transactionHash,
    logIndex,
    originChainId,
    destinationChainId,
  }): Promise<string> {
    return this.bridgeContract.methods.getTransactionDataHash(
      to,
      amount,
      blockHash,
      transactionHash,
      logIndex,
      originChainId,
      destinationChainId,
    );
  }

  getProcessed(transactionDataHash: string) {
    return this.bridgeContract.methods.claimed(transactionDataHash);
  }

  getVersion(): Promise<string> {
    return this.bridgeContract.methods.version();
  }

  getMappedToken({ originalTokenAddress, chainId }) {
    return this.bridgeContract.methods.getSideTokenByOriginalToken(chainId, originalTokenAddress).call();
  }
}
