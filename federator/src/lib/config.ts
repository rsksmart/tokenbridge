import { ConfigChain } from './configChain';
import * as jsonConfig from '../../config/config';

const DEFAULT_RETRIE_TIMES = 3;
const DEFAULT_NFT_CONFIRMATION = 5;

export class Config {
  mainchain: ConfigChain; //the json containing the smart contract addresses in rsk
  sidechain: ConfigChain; //the json containing the smart contract addresses in eth
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

  private constructor() {
    this.mainchain = new ConfigChain(jsonConfig.mainchain);
    this.sidechain = new ConfigChain(jsonConfig.sidechain);
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

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}
