import abiAllowTokensV0 from '../../../bridge/abi/AllowTokensV0.json';
import abiAllowTokensV1 from '../../../bridge/abi/AllowTokens.json';
import { IAllowTokensV1 } from './IAllowTokensV1';
import { IAllowTokensV0 } from './IAllowTokensV0';
import * as typescriptUtils from '../lib/typescriptUtils';
import { ContractFactory } from './ContractFactory';
import { AbiItem } from 'web3-utils';
import { VERSIONS } from './Constants';
import { IAllowTokens } from './IAllowTokens';
import { ConfigChain } from '../lib/configChain';

export class AllowTokensFactory extends ContractFactory {
  async getVersion(allowTokensContract) {
    try {
      return await typescriptUtils.retryNTimes(allowTokensContract.methods.version().call());
    } catch (err) {
      return VERSIONS.V0;
    }
  }

  async createInstance(configChain: ConfigChain): Promise<IAllowTokens> {
    const web3 = this.getWeb3(configChain.host);
    const chainId = configChain.chainId;
    let allowTokensContract = this.getContractByAbiAndChainId(
      abiAllowTokensV1 as AbiItem[],
      configChain.allowTokens,
      web3,
      chainId,
    );

    const version = await this.getVersion(allowTokensContract);
    switch (version) {
      case VERSIONS.V1:
        return new IAllowTokensV1(allowTokensContract, chainId);
      case VERSIONS.V0:
        allowTokensContract = this.getContractByAbiAndChainId(
          abiAllowTokensV0 as AbiItem[],
          configChain.allowTokens,
          web3,
          chainId,
        );
        return new IAllowTokensV0(allowTokensContract, chainId);
      default:
        throw Error('Unknown AllowTokens contract version');
    }
  }
}
