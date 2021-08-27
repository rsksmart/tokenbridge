const abiFederationOld = require('../../../bridge/abi/Federation_old.json');
const abiFederationNew = require('../../../bridge/abi/Federation.json');
const abiBridge = require('../../../bridge/abi/Bridge.json');
const abiNftBridge = require('../../../bridge/abi/NFTBridge.json');
const FederationInterfaceV1 = require('./IFederationV1.js');
const FederationInterfaceV2 = require('./IFederationV2.js');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');
const ContractFactory = require('./ContractFactory');

module.exports = class FederationFactory extends ContractFactory {

    constructor(config, logger, Web3) {
        super(config, logger, Web3)
        this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
        this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
        if (this.config.mainchain.nftBridge) {
          this.mainChainNftBridgeContract = new this.mainWeb3.eth.Contract(abiNftBridge, this.config.mainchain.nftBridge);
        }
        if (this.config.sidechain.nftBridge) {
          this.sideChainNftBridgeContract = new this.sideWeb3.eth.Contract(abiNftBridge, this.config.sidechain.nftBridge);
        }
    }

    async createInstance(web3, address) {
        let federationContract = this.getContractByAbi(abiFederationNew, address, web3);
        const version = await this.getVersion(federationContract);

        if (version === 'v2' || version === 'v3') {
          return new FederationInterfaceV2(this.config, federationContract);
        } else if (version === 'v1') {
          federationContract = this.getContractByAbi(abiFederationOld, address, web3);
          return new FederationInterfaceV1(this.config, federationContract);
        } else {
          throw Error('Unknown Federation contract version');
        }
      }

    createFederatorInstance(web3, address) {
      const federationContract = this.getContractByAbi(abiFederationNew, address, web3);
      return new FederationInterfaceV2(this.config, federationContract);
    }

    async getVersion(federationContract) {
        try {
            return await utils.retry3Times(federationContract.methods.version().call);
        } catch(err) {
            return "v1";
        }
    }

    async getMainFederationContract() {
        try {
            const federationAddress = await utils.retry3Times(this.mainChainBridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.mainWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Main Federation Contract`, err);
        }
    }

    async getSideFederationContract() {
        try {
            const federationAddress = await utils.retry3Times(this.sideChainBridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.sideWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side Federation Contract`, err);
        }
    }

  async getMainFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(this.mainChainNftBridgeContract.methods.getFederation().call);
      return this.createFederatorInstance(this.mainWeb3, federationAddress);
    } catch(err) {
      throw new CustomError(`Exception creating Main Federation NFT Contract`, err);
    }
  }

  async getSideFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(this.mainChainNftBridgeContract.methods.getFederation().call);
      return this.createFederatorInstance(this.sideWeb3, federationAddress);
    } catch(err) {
      throw new CustomError(`Exception creating Side Federation NFT Contract`, err);
    }
  }
}
