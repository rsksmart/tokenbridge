export class IBridgeNft {
  nftBridgeContract: any;

  constructor(nftBridgeContract: any) {
    this.nftBridgeContract = nftBridgeContract;
  }

  getFederation(): any {
    return this.nftBridgeContract.methods.getFederation();
  }

  getPastEvents(eventName: string, options: any): any {
    return this.nftBridgeContract.getPastEvents(eventName, options);
  }

  getAddress(): string {
    return this.nftBridgeContract.options.address;
  }

  getProcessed(transactionHash: string): any {
    return this.nftBridgeContract.methods.processed(transactionHash).call();
  }

  getVersion(): string {
    return this.nftBridgeContract.methods.version();
  }
}
