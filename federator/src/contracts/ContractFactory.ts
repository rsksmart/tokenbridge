import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { ConfigChain } from '../lib/configChain';
import { ConfigData } from '../lib/config';
import { LogWrapper } from '../lib/logWrapper';
export class ContractFactory {
  config: ConfigData;
  sideChain: ConfigChain;
  logger: LogWrapper;
  mainWeb3: Web3;
  sideWeb3: Web3;
  contractsByAbi: Map<AbiItem[], Contract>;

  constructor(config: ConfigData, logger: LogWrapper, sideChain: ConfigChain) {
    this.config = config;
    this.sideChain = sideChain;
    this.logger = logger;
    this.mainWeb3 = new Web3(config.mainchain.host);
    this.sideWeb3 = new Web3(sideChain.host);
    this.contractsByAbi = new Map();
  }

  // There should only be one address per abi - the address is only needed to create a new web3.eth.Contract object.
  getContractByAbi(abi: AbiItem[], address: string, web3: Web3): Contract {
    let contractForAbi = this.contractsByAbi.get(abi);
    if (!contractForAbi) {
      contractForAbi = new web3.eth.Contract(abi, address);
      this.contractsByAbi.set(abi, contractForAbi);
    }
    return contractForAbi;
  }
}
