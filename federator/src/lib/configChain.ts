import Web3 from 'web3';

const DEFAULT_BLOCK_TIME_MS = 15000;
const DEFAULT_FROM_BLOCK = 0;

export interface ConfigChainParams {
  name: string;
  chainId: number;
  bridge: string;
  host: string;
  nftBridge?: string;
  testToken?: string;
  fromBlock?: number;
  blockTimeMs?: number;
}

export class ConfigChain {
  name: string;
  chainId: number;
  bridge: string;
  nftBridge: string;
  testToken: string;
  host: string;
  fromBlock: number;
  blockTimeMs: number;

  constructor(chainConfig: ConfigChainParams) {
    this.name = chainConfig.name;
    this.chainId = chainConfig.chainId;
    this.bridge = chainConfig.bridge;
    this.host = chainConfig.host;
    this.testToken = chainConfig?.testToken;
    this.nftBridge = chainConfig?.nftBridge;
    this.fromBlock = chainConfig?.fromBlock ?? DEFAULT_FROM_BLOCK;
    this.blockTimeMs = chainConfig?.blockTimeMs ?? DEFAULT_BLOCK_TIME_MS;
  }

  public validateNft(): boolean {
    return Web3.utils.isAddress(this.nftBridge);
  }
}
