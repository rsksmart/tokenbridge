import { IBridge } from '../contracts/IBridge';
import { BN } from 'ethereumjs-util';
import { IAllowTokens } from '../contracts/IAllowTokens';
import { TransactionSender } from '../lib/TransactionSender';
import { ConfigChain } from '../lib/configChain';
import { FederationFactory } from '../contracts/FederationFactory';
import { AllowTokensFactory } from '../contracts/AllowTokensFactory';
import { BridgeFactory } from '../contracts/BridgeFactory';
import { IFederation } from '../contracts/IFederation';

export interface BaseLogsParams {
  sideChainId: number;
  mainChainId: number;
  transactionSender: TransactionSender;
  currentBlock: number;
  mediumAndSmall: boolean;
  confirmations: { mediumAmountConfirmations: number; largeAmountConfirmations: number };
  sideChainConfig: ConfigChain;
  federationFactory: FederationFactory;
  allowTokensFactory: AllowTokensFactory;
  bridgeFactory: BridgeFactory;
}

export interface GetLogsParams extends BaseLogsParams {
  fromBlock: number;
  toBlock: number;
}

export interface ProcessLogsParams extends BaseLogsParams {
  logs: any[];
}

export interface ProcessLogParams extends BaseLogsParams {
  log: any;
  sideFedContract: IFederation;
  allowTokens: IAllowTokens;
  federatorAddress: string;
  sideBridgeContract: IBridge;
}

export interface ProcessTransactionParams extends ProcessLogParams {
  tokenAddress: string;
  senderAddress: string;
  receiver: string;
  amount: BN;
  typeId: string;
  transactionId: string;
  originChainId: number;
  destinationChainId: number;
}
export interface VoteTransactionParams extends ProcessTransactionParams {
  blockHash: string;
  transactionHash: string;
  logIndex: number;
}

export interface TransactionIdParams {
  originalTokenAddress: string;
  sender: string;
  receiver: string;
  amount: BN;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  originChainId: number;
  destinationChainId: number;
}

export interface VoteTransactionV3Params extends TransactionIdParams {
  tokenType: number;
}
