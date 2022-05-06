import { ConfigChain, ConfigChainParams } from './configChain';
import * as jsonConfigDefault from '../../config/config';
const DEFAULT_RETRIE_TIMES = 3;
const DEFAULT_ENDPOINT_PORT = 5000;

export interface JsonConfigParams {
  mainchain: ConfigChainParams;
  sidechain: ConfigChainParams | ConfigChainParams[];
  runEvery: number;
  privateKey: string;
  storagePath: string;
  etherscanApiKey: string;
  runHeartbeatEvery: number;
  endpointsPort?: number;
  federatorRetries?: number;
  checkHttps?: boolean;
  explorer?: string;
}

export class ConfigData {
  mainchain: ConfigChain; //the json containing the smart contract addresses in rsk
  sidechain: ConfigChain[]; //the json containing the smart contract addresses in eth
  runEvery: number; // In minutes,
  privateKey: string; // private key of federator wallet
  storagePath: string; // the path were the db is going to be stored
  etherscanApiKey: string; // If using ganache can be any string
  runHeartbeatEvery: number; // In hours
  endpointsPort: number; // Server port
  federatorRetries: number;
  checkHttps: boolean;
  explorer?: string;
}

export class Config extends ConfigData {
  private static instance: Config;

  private constructor(jsonConfig: JsonConfigParams) {
    super();
    this.mainchain = new ConfigChain(jsonConfig.mainchain);
    this.sidechain = this.getConfigsAsArray(jsonConfig.sidechain);
    this.runEvery = jsonConfig.runEvery;
    this.privateKey = jsonConfig.privateKey;
    this.storagePath = jsonConfig.storagePath ?? __dirname;
    this.etherscanApiKey = jsonConfig.etherscanApiKey;
    this.runHeartbeatEvery = jsonConfig.runHeartbeatEvery;
    this.explorer = jsonConfig.explorer;
    this.endpointsPort = jsonConfig.endpointsPort ?? DEFAULT_ENDPOINT_PORT;
    this.federatorRetries = jsonConfig.federatorRetries ?? DEFAULT_RETRIE_TIMES;
    this.checkHttps = jsonConfig.checkHttps ?? true;
  }

  private getConfigs(): ConfigChain[] {
    return this.sidechain.concat(this.mainchain);
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
