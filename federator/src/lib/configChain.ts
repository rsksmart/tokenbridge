const DEFAULT_BLOCK_TIME_MS = 3000;
const DEFAULT_FROM_BLOCK = 0;

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

  constructor(chainConfig: {
    bridge: string;
    federation: string;
    multiSig: string;
    allowTokens: string;
    host: string;
    nftBridge?: string;
    testToken?: string;
    fromBlock?: number;
    blockTimeMs?: number;
  }) {
    this.bridge = chainConfig.bridge;
    this.nftBridge = chainConfig.nftBridge;
    this.federation = chainConfig.federation;
    this.multiSig = chainConfig.multiSig;
    this.allowTokens = chainConfig.allowTokens;
    this.testToken = chainConfig.testToken;
    this.host = chainConfig.host;
    this.fromBlock = chainConfig.fromBlock ?? DEFAULT_FROM_BLOCK;
    this.blockTimeMs = chainConfig.blockTimeMs ?? DEFAULT_BLOCK_TIME_MS;
  }
}




