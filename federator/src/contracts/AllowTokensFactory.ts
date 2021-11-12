import abiAllowTokensV0 from '../../../bridge/abi/AllowTokensV0.json';
import abiAllowTokensV1 from '../../../bridge/abi/AllowTokensV1.json';
import abiAllowTokensV2 from '../../../bridge/abi/AllowTokens.json';
import abiBridgeV3 from '../../../bridge/abi/Bridge.json';
import { IAllowTokensV1 } from './IAllowTokensV1';
import { IAllowTokensV0 } from './IAllowTokensV0';
import CustomError from '../lib/CustomError';
import utils from '../lib/utils';
import { Config } from '../../config/types';
import { IAllowTokensV2 } from './IAllowTokensV2';
import { ContractFactory } from './ContractFactory';
import { AbiItem } from 'web3-utils';
import { VERSIONS } from './Constants';
import { Logger } from 'log4js';

export class AllowTokensFactory extends ContractFactory {
  mainChainBridgeContract: any;
  sideChainBridgeContract: any;
  constructor(config: Config, logger: Logger) {
    super(config, logger);
    this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(
      abiBridgeV3 as AbiItem[],
      this.config.mainchain.bridge,
    );
    this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(
      abiBridgeV3 as AbiItem[],
      this.config.sidechain.bridge,
    );
  }

  async getVersion(allowTokensContract) {
    try {
      return await utils.retry3Times(allowTokensContract.methods.version().call);
    } catch (err) {
      return VERSIONS.V0;
    }
  }

  async createInstance(web3, address) {
    let allowTokensContract = this.getContractByAbi(abiAllowTokensV2 as AbiItem[], address, web3);
    const version = await this.getVersion(allowTokensContract);
    const chainId = await utils.retry3Times(web3.eth.net.getId);

    switch (version) {
      case VERSIONS.V2:
        return new IAllowTokensV2(allowTokensContract, chainId);
      case VERSIONS.V1:
        allowTokensContract = this.getContractByAbi(abiAllowTokensV1 as AbiItem[], address, web3);
        return new IAllowTokensV1(allowTokensContract);
      case VERSIONS.V0:
        allowTokensContract = this.getContractByAbi(abiAllowTokensV0 as AbiItem[], address, web3);
        return new IAllowTokensV0(allowTokensContract, chainId);
      default:
        throw Error('Unknown AllowTokens contract version');
    }
  }

  async getMainAllowTokensContract() {
    try {
      const allowTokensAddress = await utils.retry3Times(this.mainChainBridgeContract.methods.allowTokens().call);
      return await this.createInstance(this.mainWeb3, allowTokensAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Main AllowTokens Contract`, err);
    }
  }

  async getSideAllowTokensContract() {
    try {
      const allowTokensAddress = await utils.retry3Times(this.sideChainBridgeContract.methods.allowTokens().call);
      return await this.createInstance(this.sideWeb3, allowTokensAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Side AllowTokens Contract`, err);
    }
  }
}
