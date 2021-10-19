import { Config } from '../../config/types';
import { Contract } from 'web3-eth-contract';
import { V2 } from './Constants';

export class IFederationV2 {
  federationContract: Contract;
  config: Config;

  constructor(config: Config, fedContract: Contract) {
    this.federationContract = fedContract;
    this.config = config;
  }

  getVersion() {
    return V2;
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
    fedRskBlock: any,
    fedEthBlock: any,
    fedVSN: any,
    nodeRskInfo: any,
    nodeEthInfo: any,
  ) {
    const txData = await this.federationContract.methods
      .emitHeartbeat(fedRskBlock, fedEthBlock, fedVSN, nodeRskInfo, nodeEthInfo)
      .encodeABI();

    await txSender.sendTransaction(this.getAddress(), txData, 0, this.config.privateKey);
  }
}
