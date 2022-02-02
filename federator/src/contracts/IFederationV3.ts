import { Contract, EventData } from 'web3-eth-contract';
import { VERSIONS } from './Constants';
import { IFederation } from './IFederation';
import { ConfigChain } from '../lib/configChain';
import { TransactionIdParams, VoteTransactionV3Params } from '../types/federator';

export class IFederationV3 implements IFederation {
  federationContract: Contract;
  config: ConfigChain;
  privateKey: string;

  constructor(config: ConfigChain, fedContract: Contract, privateKey: string) {
    this.federationContract = fedContract;
    this.config = config;
    this.privateKey = privateKey;
  }

  getVersion(): string {
    return VERSIONS.V3;
  }

  isMember(address: string): Promise<any> {
    return this.federationContract.methods.isMember(address).call();
  }

  setNFTBridge(address: string, from: string): Promise<any> {
    return this.federationContract.methods.setNFTBridge(address).call({ from });
  }

  getTransactionId(paramsObj: TransactionIdParams): Promise<any> {
    return this.federationContract.methods
      .getTransactionId(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
        paramsObj.originChainId,
        paramsObj.destinationChainId,
      )
      .call();
  }

  transactionWasProcessed(txId: string): Promise<boolean> {
    return this.federationContract.methods.transactionWasProcessed(txId).call();
  }

  hasVoted(txId: string, from: string): Promise<boolean> {
    return this.federationContract.methods.hasVoted(txId).call({ from });
  }

  getVoteTransactionABI(paramsObj: VoteTransactionV3Params): Promise<any> {
    return this.federationContract.methods
      .voteTransaction(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
        paramsObj.tokenType,
        paramsObj.originChainId,
        paramsObj.destinationChainId,
      )
      .encodeABI();
  }

  getAddress(): string {
    return this.federationContract.options.address;
  }

  getPastEvents(eventName: string, options: any): Promise<EventData[]> {
    return this.federationContract.getPastEvents(eventName, options);
  }

  async emitHeartbeat(
    txSender: { sendTransaction: (arg0: string, arg1: any, arg2: number, arg3: string) => any },
    fedVersion: any,
    fedChainsIds: any[],
    fedChainsBlocks: any[],
    fedChainsInfo: any[],
  ) {
    const emitHeartbeat = await this.federationContract.methods.emitHeartbeat(
      fedVersion,
      fedChainsIds,
      fedChainsBlocks,
      fedChainsInfo,
    );

    const txData = emitHeartbeat.encodeABI();
    return await txSender.sendTransaction(this.getAddress(), txData, 0, this.privateKey);
  }
}
