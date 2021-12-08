import { Contract, EventData } from 'web3-eth-contract';
import { ConfigData } from '../lib/config';
import { TransactionIdParams, VoteTransactionParams } from './IFederationV3';

export interface IFederation {
  federationContract: Contract;
  config: ConfigData;

  getVersion(): string;

  isMember(address: string): Promise<any>;

  getTransactionId(paramsObj: TransactionIdParams): Promise<any>;

  transactionWasProcessed(txId: string): Promise<boolean>;

  hasVoted(txId: string, from: string): Promise<boolean>;

  getVoteTransactionABI(paramsObj: VoteTransactionParams): Promise<any>;

  getAddress(): string;

  getPastEvents(eventName: string, options: any): Promise<EventData[]>;

  emitHeartbeat(
    txSender: { sendTransaction: (arg0: string, arg1: any, arg2: number, arg3: string) => any },
    fedRskBlock: any,
    fedEthBlock: any,
    fedVersion: any,
    nodeRskInfo: any,
    nodeEthInfo: any,
  );
}
