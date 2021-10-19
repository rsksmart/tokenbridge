import { Config } from '../../config/configts';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

export class ContractFactory {
  config: any;
  logger: any;
  mainWeb3: any;
  sideWeb3: any;
  contractsByAbi: Map<any, Contract>;

  constructor(config: Config, logger: any) {
    this.config = config;
    this.logger = logger;
    this.mainWeb3 = new Web3(config.mainchain.host);
    this.sideWeb3 = new Web3(config.sidechain.host);
    this.contractsByAbi = new Map();
  }

  // There should only be one address per abi - the address is only needed to create a new web3.eth.Contract object.
  getContractByAbi(abi: AbiItem, address: string, web3: Web3): Contract {
    let contractForAbi = this.contractsByAbi.get(abi);
    if (!contractForAbi) {
      contractForAbi = new web3.eth.Contract(abi, address);
      this.contractsByAbi.set(abi, contractForAbi);
    }
    return contractForAbi;
  }
}
