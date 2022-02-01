import { ConfigChain } from '../lib/configChain';
import { Contract } from 'web3-eth-contract';
import { IBridge } from './IBridge';

export interface IBridgeFactory {
  getVersion(bridgeContract: Contract): Promise<string>;

  createInstance(configChain: ConfigChain): Promise<IBridge>;
}
