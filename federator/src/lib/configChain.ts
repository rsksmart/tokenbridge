import Web3 from "web3";

const DEFAULT_BLOCK_TIME_MS = 15000;
const DEFAULT_FROM_BLOCK = 0;

export interface ConfigChainParams {
  bridge: string;
  federation: string;
  multiSig: string;
  allowTokens: string;
  host: string;
  nftBridge?: string;
  testToken?: string;
  fromBlock?: number;
  blockTimeMs?: number;
}

export class ConfigChain {
  bridge: string;
  nftBridge: string;
  federation: string;
  multiSig: string;
  allowTokens: string;
  testToken: string;
  host: string;
  fromBlock: number;
  blockTimeMs: number;

  constructor(chainConfig: ConfigChainParams) {
    this.bridge = chainConfig.bridge;
    this.federation = chainConfig.federation;
    this.multiSig = chainConfig.multiSig;
    this.allowTokens = chainConfig.allowTokens;
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
