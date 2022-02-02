import abiNftBridge from '../../../bridge/abi/NFTBridge.json';
import { IBridgeNft } from './IBridgeNft';
import { AbiItem } from 'web3-utils';
import { ContractFactory } from './ContractFactory';
import { ConfigChain } from '../lib/configChain';
import * as typescriptUtils from '../lib/typescriptUtils';
import { Contract } from 'web3-eth-contract';

export class BridgeNFTFactory extends ContractFactory {
  async getVersion(bridgeContract: Contract): Promise<string> {
    return typescriptUtils.retryNTimes(bridgeContract.methods.version().call());
  }

  async createInstance(configChain: ConfigChain): Promise<IBridgeNft> {
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
