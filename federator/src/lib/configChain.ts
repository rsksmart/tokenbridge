const DEFAULT_BLOCK_TIME_MS = 15000;
const DEFAULT_FROM_BLOCK = 0;

export interface ConfigChainParams {
  name: string;
  chainId: number;
  bridge: string;
  allowTokens: string;
  federation: string;
  host: string;
  testToken?: string;
  fromBlock?: number;
  blockTimeMs?: number;
}

export class ConfigChain {
  name: string;
  chainId: number;
  bridge: string;
  allowTokens: string;
  federation: string;
  testToken: string;
  host: string;
  fromBlock: number;
  blockTimeMs: number;

  constructor(chainConfig: ConfigChainParams) {
    this.name = chainConfig.name;
    this.chainId = chainConfig.chainId;
    this.bridge = chainConfig.bridge;
    this.federation = chainConfig.federation;
    this.allowTokens = chainConfig.allowTokens;
    this.host = chainConfig.host;
    this.testToken = chainConfig?.testToken;
    this.fromBlock = chainConfig?.fromBlock ?? DEFAULT_FROM_BLOCK;
    this.blockTimeMs = chainConfig?.blockTimeMs ?? DEFAULT_BLOCK_TIME_MS;
  }
}
