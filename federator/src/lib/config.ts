import { ConfigChain, ConfigChainParams } from './configChain';
import * as jsonConfigDefault from '../../config/config';
const DEFAULT_RETRIE_TIMES = 3;
const DEFAULT_NFT_CONFIRMATION = 5;

interface JsonConfigParams {
  mainchain: ConfigChainParams;
  sidechain: ConfigChainParams | ConfigChainParams[];
  runEvery: number;
  confirmations: number;
  privateKey: string;
  storagePath: string;
  etherscanApiKey: string;
  runHeartbeatEvery: number;
  endpointsPort: number;
  nftConfirmations?: number;
  federatorRetries?: number;
  useNft?: boolean;
  checkHttps?: boolean;
}

export class Config {
  mainchain: ConfigChain; //the json containing the smart contract addresses in rsk
  sidechain: ConfigChain[]; //the json containing the smart contract addresses in eth
  runEvery: number; // In minutes,
  confirmations: number; // Number of blocks before processing it, if working with ganache set as 0
  privateKey: string; // private key of federator wallet
  storagePath: string; // the path were the db is going to be stored
  etherscanApiKey: string; // If using ganache can be any string
  runHeartbeatEvery: number; // In hours
  endpointsPort: number; // Server port
  nftConfirmations: number; // number of block confirmations for the nft bridge
  useNft: boolean;
  federatorRetries: number;
  checkHttps: boolean;

  private static instance: Config;

  private constructor(jsonConfig: JsonConfigParams) {
    this.mainchain = new ConfigChain(jsonConfig.mainchain);
    this.sidechain = this.getConfigsAsArray(jsonConfig.sidechain);
    this.runEvery = jsonConfig.runEvery;
    this.confirmations = jsonConfig.confirmations;
    this.privateKey = jsonConfig.privateKey;
    this.storagePath = jsonConfig.storagePath ?? __dirname;
    this.etherscanApiKey = jsonConfig.etherscanApiKey;
    this.runHeartbeatEvery = jsonConfig.runHeartbeatEvery;
    this.endpointsPort = jsonConfig.endpointsPort;
    this.nftConfirmations = jsonConfig.nftConfirmations ?? DEFAULT_NFT_CONFIRMATION;
    this.federatorRetries = jsonConfig.federatorRetries ?? DEFAULT_RETRIE_TIMES;
    this.useNft = jsonConfig.useNft ?? false;
    this.checkHttps = jsonConfig.checkHttps ?? true;
  }

  private getConfigsAsArray(configs: ConfigChainParams | ConfigChainParams[]): ConfigChain[] {
    if (!Array.isArray(configs)) {
      return [new ConfigChain(configs)];
    }
    return configs.map((config) => new ConfigChain(config));
  }

  public static getInstance(jsonConfig: JsonConfigParams = jsonConfigDefault): Config {
    if (!Config.instance) {
      Config.instance = new Config(jsonConfig);
    }
    return Config.instance;
  }
}
