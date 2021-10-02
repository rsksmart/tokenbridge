const FederationV2 = artifacts.require('FederationV2');
const FederationV3 = artifacts.require('FederationV3');
const FederationProxy = artifacts.require('FederationProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const NftBridge = artifacts.require("NFTBridge");
const utils = require("../utils");

contract('Federation', async function (accounts) {
  const deployer = accounts[0];
  const federator1 = accounts[2];
  const federator2 = accounts[3];
  const bridge = utils.getRandomAddress();

  beforeEach(async function() {
    this.federationV2 = await FederationV2.new();
    this.proxyAdmin = await ProxyAdmin.new();
    this.federationV3 = await FederationV3.new();
    this.nftBridge = await NftBridge.new();
  });

  describe('Upgrate from FederationV2 to Federation', async function () {
    it('should update the contract version from v2 to v3', async function () {
      const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
      const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

      let result = await proxyFederationV2.methods.version().call();
      assert.equal(result, 'v2');

      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
      const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      result = await proxyFederation.methods.version().call();
      assert.equal(result, 'v3');
    });

    it('should maintain the same contract owner from Federation v2', async function () {
      const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
      const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

      const ownerV2 = await proxyFederationV2.methods.owner().call();
      assert.equal(ownerV2, deployer);

      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
      const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      const ownerV3 = await proxyFederation.methods.owner().call();
      assert.equal(ownerV2, ownerV3);
    });

    it('should not have setNFTBridge method before upgrade', async function () {
      const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
      const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

      assert.equal(proxyFederationV2.methods.setNFTBridge, undefined);
    });

    it('should have setNFTBridge method after update', async function () {
      const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);

      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
      const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      await proxyFederation.methods.setNFTBridge(this.nftBridge.address).send({from: deployer});
      const nftBridgeSet = await proxyFederation.methods.bridgeNFT().call();
      assert.equal(nftBridgeSet, this.nftBridge.address);
    });

    it('should maintain the members from the Federation v2', async function () {
      const initialMembers  = [federator1, federator2];
      const initData = await this.federationV2.contract.methods.initialize(initialMembers, 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
      const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

      let members = await proxyFederationV2.methods.getMembers().call();
      assert.equal(members.length, initialMembers.length);
      assert.equal(members[0], initialMembers[0]);
      assert.equal(members[1], initialMembers[1]);


      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
      const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      members = await proxyFederation.methods.getMembers().call();
      assert.equal(members.length, initialMembers.length);
      assert.equal(members[0], initialMembers[0]);
      assert.equal(members[1], initialMembers[1]);
    });
  });
});
