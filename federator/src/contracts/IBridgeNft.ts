import { EventData } from 'web3-eth-contract';

export class IBridgeNft {
  nftBridgeContract: any;

  constructor(nftBridgeContract: any) {
    this.nftBridgeContract = nftBridgeContract;
  }

  getFederation() {
    return this.nftBridgeContract.methods.getFederation();
  }

  getPastEvents(eventName: string, destinationChainId: number, options: any): Promise<EventData[]> {
    options._destinationChainId = destinationChainId;
    return this.nftBridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.nftBridgeContract.options.address;
  }

  getProcessed(transactionHash: string) {
    return this.nftBridgeContract.methods.processed(transactionHash);
  }

  getVersion() {
    return this.nftBridgeContract.methods.version();
  }

  getMappedToken({ originalTokenAddress, chainId }) {
    return this.nftBridgeContract.methods.getSideTokenByOriginalToken(chainId, originalTokenAddress).call();
  }
}
