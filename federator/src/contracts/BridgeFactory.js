const abiBridgeV2 = require('../../../bridge/abi/BridgeV2.json');
const abiBridgeV3 = require('../../../bridge/abi/BridgeV3.json');
const abiNftBridge = require('../../../bridge/abi/NFTBridge.json');
const BridgeInterface = require('./IBridge.js');
const NftBridgeInterface = require('./IBridgeNft');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');
const ContractFactory = require('./ContractFactory');

module.exports = class BridgeFactory extends ContractFactory {

  constructor(config, logger, Web3) {
    super(config, logger, Web3);
  }

  async getVersion(bridgeContract) {
    return utils.retry3Times(bridgeContract.methods.version().call)
  }

  async createInstance(web3, address) {
    let bridgeContract = this.getContractByAbi(abiBridgeV2, address, web3);
    const version = await this.getVersion(bridgeContract);
    if (version === 'v3') {
      bridgeContract = this.getContractByAbi(abiBridgeV3, address, web3);
    } else if (!['v2','v1'].includes(version)) {
      throw Error('Unknown Bridge contract version');
    }
    return new BridgeInterface(bridgeContract);
  }

  createInstanceNft(web3, address) {
    const nftBridgeContract = this.getContractByAbi(abiNftBridge, address, web3);
    return new NftBridgeInterface.IBridgeNft(nftBridgeContract);
  }

  async getMainBridgeContract() {
    try {
      return await this.createInstance(
        this.mainWeb3,
        this.config.mainchain.bridge
      );
    } catch(err) {
      throw new CustomError(`Exception creating Main Bridge Contract`, err);
    }
  }

  async getSideBridgeContract() {
    try {
      return await this.createInstance(
        this.sideWeb3,
        this.config.sidechain.bridge
      );
    } catch(err) {
      throw new CustomError(`Exception creating Side Bridge Contract`, err);
    }
  }

  getMainNftBridgeContract() {
    try {
      return this.createInstanceNft(this.mainWeb3, this.config.mainchain.nftBridge);
    } catch(err) {
      throw new CustomError(`Exception creating Main Bridge NFT Contract`, err);
    }
  }

  getSideNftBridgeContract() {
    try {
      return this.createInstanceNft(this.sideWeb3, this.config.sidechain.nftBridge);
    } catch(err) {
      throw new CustomError(`Exception creating Side Bridge NFT Contract`, err);
    }
  }
}