import { Contract, EventData } from 'web3-eth-contract';
import { ConfigChain } from '../lib/configChain';
import { TransactionIdParams, VoteTransactionParams } from './IFederationV3';

export interface IFederation {
  federationContract: Contract;
  config: ConfigChain;

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
    fedVersion: any,
    fedChainsIds: any[],
    fedChainsBlocks: any[],
    fedChainsInfo: any[],
  );
}
