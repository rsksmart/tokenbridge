import { ConfigChain } from './configChain';

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
}
