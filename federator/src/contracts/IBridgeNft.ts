export class IBridgeNft {
  nftBridgeContract: any;

  constructor(nftBridgeContract: any) {
    this.nftBridgeContract = nftBridgeContract;
  }

  getFederation(): Promise<string> {
    return this.nftBridgeContract.methods.getFederation().call();
  }

  getPastEvents(eventName: string, options: any): Promise<any> {
    return this.nftBridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.nftBridgeContract.options.address;
  }

  getProcessed(transactionHash: string): Promise<boolean> {
    return this.nftBridgeContract.methods.processed(transactionHash).call();
  }

  getVersion(): Promise<string> {
    return this.nftBridgeContract.methods.version().call();
  }

  getMappedToken({ originalTokenAddress, chainId }) {
    return this.nftBridgeContract.methods.getSideTokenByOriginalToken(chainId, originalTokenAddress);
  }
}
