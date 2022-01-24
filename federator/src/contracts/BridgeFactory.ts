import abiBridgeV3 from '../../../bridge/abi/BridgeV3.json';
import abiBridgeV4 from '../../../bridge/abi/Bridge.json';
import abiNftBridge from '../../../bridge/abi/NFTBridge.json';
import { IBridgeV3 } from './IBridgeV3';
import { IBridgeV4 } from './IBridgeV4';
import { IBridgeNft } from './IBridgeNft';
import { CustomError } from '../lib/CustomError';
import * as utils from '../lib/utils';
import { AbiItem } from 'web3-utils';
import { ContractFactory } from './ContractFactory';
import { VERSIONS } from './Constants';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { ConfigChain } from '../lib/configChain';
import { ConfigData } from '../lib/config';
import { LogWrapper } from '../lib/logWrapper';

export class BridgeFactory extends ContractFactory {
  constructor(config: ConfigData, logger: LogWrapper, sideChain: ConfigChain) {
    super(config, logger, sideChain);
  }

  async getVersion(bridgeContract: Contract) {
    return utils.retry3Times(bridgeContract.methods.version().call);
  }

  async createInstance(web3: Web3, address: string) {
    let bridgeContract = this.getContractByAbi(abiBridgeV4 as AbiItem[], address, web3);
    const version = await this.getVersion(bridgeContract);
    const chainId = await web3.eth.net.getId();
    this.logger.warn("===version=====", version);
    switch (version) {
      case VERSIONS.V4:
        return new IBridgeV4(bridgeContract, chainId);
      case VERSIONS.V3:
        bridgeContract = this.getContractByAbi(abiBridgeV3 as AbiItem[], address, web3);
        return new IBridgeV3(bridgeContract);
      default:
        throw Error('Unknown or deprecated Bridge contract version');
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
      return await this.createInstance(this.sideWeb3, this.sideChain.bridge);
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
      return this.createInstanceNft(this.sideWeb3, this.sideChain.nftBridge);
    } catch (err) {
      throw new CustomError(`Exception creating Side Bridge NFT Contract`, err);
    }
  }
}
