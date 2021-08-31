import { Config } from '../../config/configts';

export class IFederationV3 {
  private federationContract: any;
  private config: Config;

  constructor(config: Config, fedContract: any) {
    this.federationContract = fedContract;
    this.config = config;
  }

  getVersion(): string {
    return 'v3';
  }

  isMember(address: string): Promise<boolean> {
    return this.federationContract.methods.isMember(address);
  }

  setNFTBridge(address: string): Promise<any> {
    return this.federationContract.methods.setNFTBridge(address);
  }

  getTransactionId(paramsObj): Promise<string> {
    return this.federationContract.methods.getTransactionId(
      paramsObj.originalTokenAddress,
      paramsObj.sender,
      paramsObj.receiver,
      paramsObj.amount,
      paramsObj.blockHash,
      paramsObj.transactionHash,
      paramsObj.logIndex,
    );
  }

  transactionWasProcessed(txId: string): Promise<boolean> {
    return this.federationContract.methods.transactionWasProcessed(txId);
  }

  hasVoted(txId: string): Promise<boolean> {
    return this.federationContract.methods.hasVoted(txId);
  }

  voteTransaction(paramsObj: any): Promise<any> {
    return this.federationContract.methods.voteTransaction(
      paramsObj.originalTokenAddress,
      paramsObj.sender,
      paramsObj.receiver,
      paramsObj.amount,
      paramsObj.blockHash,
      paramsObj.transactionHash,
      paramsObj.logIndex,
      paramsObj.tokenType,
    );
  }

  getAddress(): string {
    return this.federationContract.options.address;
  }

  getPastEvents(eventName: string, options: any): Promise<any> {
    return this.federationContract.getPastEvents(eventName, options);
  }

  async emitHeartbeat(txSender, fedRskBlock, fedEthBlock, fedVSN, nodeRskInfo, nodeEthInfo) {
    const emitHeartbeat = await this.federationContract.methods.emitHeartbeat(
      fedRskBlock,
      fedEthBlock,
      fedVSN,
      nodeRskInfo,
      nodeEthInfo,
    );

    const txData = emitHeartbeat.encodeABI();

    await txSender.sendTransaction(this.getAddress(), txData, 0, this.config.privateKey);
  }
}
