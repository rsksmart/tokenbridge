import abiBridgeV3 from '../../../bridge/abi/BridgeV3.json';
import abiBridgeV4 from '../../../bridge/abi/Bridge.json';
import { IBridgeV3 } from './IBridgeV3';
import { IBridgeV4 } from './IBridgeV4';
import * as typescriptUtils from '../lib/typescriptUtils';
import { AbiItem } from 'web3-utils';
import { ContractFactory } from './ContractFactory';
import { VERSIONS } from './Constants';
import { Contract } from 'web3-eth-contract';
import { ConfigChain } from '../lib/configChain';
import { IBridge } from './IBridge';
import abiNftBridge from '../../../bridge/abi/NFTBridge.json';
import { IBridgeNft } from './IBridgeNft';

export class BridgeFactory extends ContractFactory {
  async getVersion(bridgeContract: Contract): Promise<string> {
    return typescriptUtils.retryNTimes(bridgeContract.methods.version().call());
  }

  async createInstance(configChain: ConfigChain): Promise<IBridge> {
    const web3 = this.getWeb3(configChain.host);
    const chainId = configChain.chainId;
    let bridgeContract = this.getContractByAbiAndChainId(abiBridgeV4 as AbiItem[], configChain.bridge, web3, chainId);
    const version = await this.getVersion(bridgeContract);
    switch (version) {
      case VERSIONS.V4:
        return new IBridgeV4(bridgeContract, configChain.chainId);
      case VERSIONS.V3:
        bridgeContract = this.getContractByAbiAndChainId(abiBridgeV3 as AbiItem[], configChain.bridge, web3, chainId);
        return new IBridgeV3(bridgeContract);
      default:
        throw Error('Unknown or deprecated Bridge contract version');
    }
  }

  async createNftInstance(configChain: ConfigChain): Promise<IBridge> {
    const web3 = this.getWeb3(configChain.host);
    const chainId = configChain.chainId;
    const nftBridgeContract = this.getContractByAbiAndChainId(
      abiNftBridge as AbiItem[],
      configChain.nftBridge,
      web3,
      chainId,
    );
    return new IBridgeNft(nftBridgeContract);
  }
}
