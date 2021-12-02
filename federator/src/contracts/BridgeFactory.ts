import abiBridgeV2 from '../../../bridge/abi/BridgeV2.json';
import abiBridgeV3 from '../../../bridge/abi/Bridge.json';
import abiNftBridge from '../../../bridge/abi/NFTBridge.json';
import { IBridge } from './IBridge';
import { IBridgeV3 } from './IBridgeV3';
import { IBridgeNft } from './IBridgeNft';
import CustomError from '../lib/CustomError';
import utils from '../lib/utils';
import { AbiItem } from 'web3-utils';
import { ContractFactory } from './ContractFactory';
import { VERSIONS } from './Constants';
import { Config } from '../lib/config';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { Logger } from 'log4js';

export class BridgeFactory extends ContractFactory {
  constructor(config: Config, logger: Logger) {
    super(config, logger);
  }

  async getVersion(bridgeContract: Contract) {
    return utils.retry3Times(bridgeContract.methods.version().call);
  }

  async createInstance(web3: Web3, address: string) {
    let bridgeContract = this.getContractByAbi(abiBridgeV3 as AbiItem[], address, web3);
    const version = await this.getVersion(bridgeContract);
    const chainId = await web3.eth.net.getId();
    switch (version) {
      case VERSIONS.V3:
        return new IBridgeV3(bridgeContract, chainId);
      case VERSIONS.V2:
      case VERSIONS.V1:
        bridgeContract = this.getContractByAbi(abiBridgeV2 as AbiItem[], address, web3);
        return new IBridge(bridgeContract);
      default:
        throw Error('Unknown Bridge contract version');
    }
  }

  createInstanceNft(web3: Web3, address: string) {
    const nftBridgeContract = this.getContractByAbi(abiNftBridge as AbiItem[], address, web3);
    return new IBridgeNft(nftBridgeContract);
  }

  async getMainBridgeContract() {
    try {
      return await this.createInstance(this.mainWeb3, this.config.mainchain.bridge);
    } catch (err) {
      throw new CustomError(`Exception creating Main Bridge Contract`, err);
    }
  }

  async getSideBridgeContract() {
    try {
      return await this.createInstance(this.sideWeb3, this.config.sidechain.bridge);
    } catch (err) {
      throw new CustomError(`Exception creating Side Bridge Contract`, err);
    }
  }

  getMainNftBridgeContract() {
    try {
      return this.createInstanceNft(this.mainWeb3, this.config.mainchain.nftBridge);
    } catch (err) {
      throw new CustomError(`Exception creating Main Bridge NFT Contract`, err);
    }
  }

  getSideNftBridgeContract() {
    try {
      return this.createInstanceNft(this.sideWeb3, this.config.sidechain.nftBridge);
    } catch (err) {
      throw new CustomError(`Exception creating Side Bridge NFT Contract`, err);
    }
  }
}
