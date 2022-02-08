import abiFederationV2 from '../../../bridge/abi/FederationV2.json';
import abiFederationV3 from '../../../bridge/abi/Federation.json';
import { IFederationV2 } from './IFederationV2';
import { IFederationV3 } from './IFederationV3';
import * as typescriptUtils from '../lib/typescriptUtils';
import { VERSIONS } from './Constants';
import { ContractFactory } from './ContractFactory';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { IFederation } from './IFederation';
import { ConfigChain } from '../lib/configChain';

export class FederationFactory extends ContractFactory {
  async createInstance(configChain: ConfigChain, privateKey: string): Promise<IFederation> {
    const web3 = this.getWeb3(configChain.host);
    const chainId = configChain.chainId;
    let federationContract = this.getContractByAbiAndChainId(
      abiFederationV3 as AbiItem[],
      configChain.federation,
      web3,
      chainId,
    );
    const version = await this.getVersion(federationContract);
    switch (version) {
      case VERSIONS.V3:
        return new IFederationV3(configChain, federationContract, privateKey);
      case VERSIONS.V2:
        federationContract = this.getContractByAbiAndChainId(
          abiFederationV2 as AbiItem[],
          configChain.federation,
          web3,
          chainId,
        );
        return new IFederationV2(configChain, federationContract, privateKey);
      default:
        throw Error('Unknown or deprecated Federation contract version');
    }
  }

  async getVersion(federationContract: Contract) {
    try {
      return await typescriptUtils.retryNTimes(federationContract.methods.version().call());
    } catch (err) {
      return 'v1';
    }
  }
}
