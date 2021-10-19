const abiFederationV2 = require("../../../bridge/abi/FederationV2.json");
const abiFederationV3 = require("../../../bridge/abi/FederationV3.json");
const abiFederationV4 = require("../../../bridge/abi/Federation.json");
const abiBridgeV3 = require("../../../bridge/abi/BridgeV3.json");
const abiNftBridge = require("../../../bridge/abi/NFTBridge.json");
const FederationInterfaceV2 = require("./IFederationV2.js");
const FederationInterfaceV3 = require("./IFederationV3");
const FederationInterfaceV4 = require("./IFederationV4");
const CustomError = require("../lib/CustomError");
const utils = require("../lib/utils");
import { V2, V3, V4 } from "./Constants";
import { ContractFactory } from "./ContractFactory";

export class FederationFactory extends ContractFactory {
  constructor(config, logger) {
    super(config, logger);
    this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(
      abiBridgeV3,
      this.config.mainchain.bridge
    );
    this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(
      abiBridgeV3,
      this.config.sidechain.bridge
    );
    if (this.config.mainchain.nftBridge) {
      this.mainChainNftBridgeContract = new this.mainWeb3.eth.Contract(
        abiNftBridge,
        this.config.mainchain.nftBridge
      );
    }
    if (this.config.sidechain.nftBridge) {
      this.sideChainNftBridgeContract = new this.sideWeb3.eth.Contract(
        abiNftBridge,
        this.config.sidechain.nftBridge
      );
    }
  }

  async createInstance(web3, address) {
    let federationContract = this.getContractByAbi(
      abiFederationV4,
      address,
      web3
    );
    const version = await this.getVersion(federationContract);

    switch (version) {
      case V4:
        return new FederationInterfaceV4.IFederationV4(
          this.config,
          federationContract
        );
      case V3:
        federationContract = this.getContractByAbi(
          abiFederationV3,
          address,
          web3
        );
        return new FederationInterfaceV3.IFederationV3(
          this.config,
          federationContract
        );
      case V2:
        federationContract = this.getContractByAbi(
          abiFederationV2,
          address,
          web3
        );
        return new FederationInterfaceV2(this.config, federationContract);
      default:
        throw Error("Unknown Federation contract version");
    }
  }

  async getVersion(federationContract) {
    try {
      return await utils.retry3Times(federationContract.methods.version().call);
    } catch (err) {
      return "v1";
    }
  }

  async getMainFederationContract() {
    try {
      const federationAddress = await utils.retry3Times(
        this.mainChainBridgeContract.methods.getFederation().call
      );
      return await this.createInstance(this.mainWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Main Federation Contract`, err);
    }
  }

  async getSideFederationContract() {
    try {
      const federationAddress = await utils.retry3Times(
        this.sideChainBridgeContract.methods.getFederation().call
      );
      return await this.createInstance(this.sideWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(`Exception creating Side Federation Contract`, err);
    }
  }

  async getMainFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(
        this.mainChainNftBridgeContract.methods.getFederation().call
      );
      return this.createFederatorInstance(this.mainWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(
        `Exception creating Main Federation NFT Contract`,
        err
      );
    }
  }

  async getSideFederationNftContract() {
    try {
      const federationAddress = await utils.retry3Times(
        this.sideChainNftBridgeContract.methods.getFederation().call
      );
      return this.createFederatorInstance(this.sideWeb3, federationAddress);
    } catch (err) {
      throw new CustomError(
        `Exception creating Side Federation NFT Contract`,
        err
      );
    }
  }

  createFederatorInstance(web3, address) {
    const federationContract = this.getContractByAbi(
      abiFederationV3,
      address,
      web3
    );
    return new FederationInterfaceV3.IFederationV3(
      this.config,
      federationContract
    );
  }
};
