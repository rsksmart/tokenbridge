import abiFederationV2 from '../../../bridge/abi/FederationV2.json';
import abiFederationV3 from '../../../bridge/abi/Federation.json';
import abiBridgeV3 from '../../../bridge/abi/Bridge.json';
import abiNftBridge from '../../../bridge/abi/NFTBridge.json';
import { IFederationV2 } from './IFederationV2';
import { IFederationV3 } from './IFederationV3';
import { CustomError } from '../lib/CustomError';
import * as utils from '../lib/utils';
import { VERSIONS } from './Constants';
import { ContractFactory } from './ContractFactory';
import { AbiItem } from 'web3-utils';
import { Logger } from 'log4js';
import { Config } from '../lib/config';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { ConfigChain } from '../lib/configChain';
import { IFederation } from './IFederation';

export class FederationFactory extends ContractFactory {
  mainChainBridgeContract: Contract;
  sideChainBridgeContract: Contract;
  mainChainNftBridgeContract: Contract;
  sideChainNftBridgeContract: Contract;

  constructor(config: Config, logger: Logger, sideChain: ConfigChain) {
    super(config, logger, sideChain);
    this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(
      abiBridgeV3 as AbiItem[],
      this.config.mainchain.bridge,
    );
    this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(abiBridgeV3 as AbiItem[], sideChain.bridge);
    if (this.config.useNft) {
      this.mainChainNftBridgeContract = new this.mainWeb3.eth.Contract(
        abiNftBridge as AbiItem[],
        this.config.mainchain.nftBridge,
      );
      this.sideChainNftBridgeContract = new this.sideWeb3.eth.Contract(abiNftBridge as AbiItem[], sideChain.nftBridge);
    }
  }

  async createInstance(web3: Web3, address: string): Promise<IFederation> {
    let federationContract = this.getContractByAbi(abiFederationV3 as AbiItem[], address, web3);
    const version = await this.getVersion(federationContract);

    switch (version) {
      case VERSIONS.V3:
        return new IFederationV3(this.config, federationContract);
      case VERSIONS.V2:
        federationContract = this.getContractByAbi(abiFederationV2 as AbiItem[], address, web3);
        return new IFederationV2(this.config, federationContract);
      default:
        throw Error('Unknown Federation contract version');
    }
  }

  async getVersion(federationContract: Contract) {
    try {
      return await utils.retry3Times(federationContract.methods.version().call);
    } catch (err) {
      return 'v1';
    }
  }

  async getMainFederationContract() {
    try {
      const federationAddress = await utils.retry3Times(this.mainChainBridgeContract.methods.getFederation().call);
      return await this.createInstance(this.mainWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Main Federation Contract`, err);
    }
  }

  async getSideFederationContract() {
    try {
      const federationAddress = await utils.retry3Times(this.sideChainBridgeContract.methods.getFederation().call);
      return await this.createInstance(this.sideWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Side Federation Contract`, err);
    }
  }

  async getMainFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(this.mainChainNftBridgeContract.methods.getFederation().call);
      return this.createFederatorInstance(this.mainWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Main Federation NFT Contract`, err);
    }
  }

  async getSideFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(this.sideChainNftBridgeContract.methods.getFederation().call);
      return this.createFederatorInstance(this.sideWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Side Federation NFT Contract`, err);
    }
  }

  createFederatorInstance(web3, address) {
    const federationContract = this.getContractByAbi(abiFederationV3 as AbiItem[], address, web3);
    return new IFederationV3(this.config, federationContract);
  }
}
