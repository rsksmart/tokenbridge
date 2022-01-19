import { ConfigData } from '../lib/config';
import { Contract } from 'web3-eth-contract';
import { VERSIONS } from './Constants';
import { IFederation } from './IFederation';

export class IFederationV2 implements IFederation {
  federationContract: Contract;
  config: ConfigData;

  constructor(config: ConfigData, fedContract: Contract) {
    this.federationContract = fedContract;
    this.config = config;
  }

  getVersion() {
    return VERSIONS.V2;
  }

  isMember(address: string) {
    return this.federationContract.methods.isMember(address);
  }

  getTransactionId(paramsObj: any) {
    return this.federationContract.methods
      .getTransactionId(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
      )
      .call();
  }

  transactionWasProcessed(txId: string) {
    return this.federationContract.methods.transactionWasProcessed(txId).call();
  }

  hasVoted(txId: string, from: string) {
    return this.federationContract.methods.hasVoted(txId).call({ from });
  }

  getVoteTransactionABI(paramsObj: any) {
    return this.federationContract.methods
      .voteTransaction(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
      )
      .encodeABI();
  }

  getAddress() {
    return this.federationContract.options.address;
  }

  getPastEvents(eventName, options) {
    return this.federationContract.getPastEvents(eventName, options);
  }

  async emitHeartbeat(
    txSender: any,
    fedVersion: any,
    fedChainsIds: any[],
    fedChainsBlocks: any[],
    fedChainsInfo: any[],
  ) {
    const txData = await this.federationContract.methods
      .emitHeartbeat(fedChainsBlocks[0], fedChainsBlocks[1], fedVersion, fedChainsInfo[0], fedChainsInfo[1])
      .encodeABI();

    return await txSender.sendTransaction(this.getAddress(), txData, 0, this.config.privateKey);
  }
}
