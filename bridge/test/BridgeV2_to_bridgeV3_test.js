const BridgeV3 = artifacts.require('Bridge');
const BridgeV2 = artifacts.require('BridgeV2');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const SideTokenFactory = artifacts.require('SideTokenFactory');
const Federation = artifacts.require('Federation');
const BridgeProxy = artifacts.require('BridgeProxy');
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensV0 = artifacts.require('AllowTokensV0');
const NftBridge = artifacts.require('NFTBridge');
const UtilsV1 = artifacts.require('UtilsV1');
const utils = require("./utils");
const chains = require('../hardhat/helper/chains');
const MainToken = artifacts.require('./MainToken');
const toWei = web3.utils.toWei;

contract('Bridge Multichain Deploy Check', async function (accounts) {
  const deployer = accounts[0];
  const bridgeManager = accounts[1];
  const federatorOwner = accounts[2];
  const federatorMember1 = accounts[3];
  const federatorMember2 = accounts[4];
  const allowTokensManager = accounts[5];
  const allowTokensPrimary = accounts[6];
  const tokenOwner = accounts[7];
  const tokenReceiver = accounts[8];
  const symbolPrefix = 'bd';
  const tokenName = 'MAIN';
  const tokenSymbol = 'MAIN';

  beforeEach(async function() {
    const utilsV1 = await UtilsV1.new();
    BridgeV2.link(utilsV1);
    this.bridgeV2 = await BridgeV2.new();
    this.bridgeV3 = await BridgeV3.new();
    this.allowTokens = await AllowTokens.new();
    this.allowTokensV0 = await AllowTokensV0.new(allowTokensManager);


    this.allowTokensV0.setMaxTokensAllowed(toWei('100000'), {from: allowTokensManager});
    this.allowTokensV0.setMinTokensAllowed(toWei('1'), {from: allowTokensManager});


    this.nftBridge = await NftBridge.new();
    this.federator = await Federation.new();
    this.proxyAdmin = await ProxyAdmin.new();
    this.sideTokenFactory = await SideTokenFactory.new();

    await this.federator.initialize([federatorMember1, federatorMember2], 1, this.bridgeV3.address, federatorOwner, this.nftBridge.address);
    await this.allowTokens.initialize(allowTokensManager, allowTokensPrimary, 1, 1, 1, [
      { description: 'BTC', limits: {
          min:toWei('0.001'),
          max:toWei('25'),
          daily:toWei('100'),
          mediumAmount:toWei('0.1'),
          largeAmount:toWei('1') }
      },
      { description: 'ETH', limits: {
          min:toWei('0.01'),
          max:toWei('750'),
          daily:toWei('3000'),
          mediumAmount:toWei('3'),
          largeAmount:toWei('30') }
      }
    ]);

    this.token = await MainToken.new(tokenName, tokenSymbol, 18, toWei('1000000000'), { from: tokenOwner });
    await this.allowTokensV0.addAllowedToken(this.token.address, {from: allowTokensManager});
  });

  describe('Upgrate from BridgeV2 to BridgeV3', async function () {
    it('should update the contract version from v2 to v3', async function () {
      const initializeDataBridgeV2 = await this.bridgeV2.contract.methods.initialize(bridgeManager, this.federator.address, this.allowTokensV0.address, this.sideTokenFactory.address, symbolPrefix).encodeABI();
      const bridgeProxy = await BridgeProxy.new(this.bridgeV2.address, this.proxyAdmin.address, initializeDataBridgeV2);
      const bridgeV2Implementation = new web3.eth.Contract(this.bridgeV2.abi, bridgeProxy.address);

      let result = await bridgeV2Implementation.methods.version().call();
      assert.equal(result, 'v2');

      await this.proxyAdmin.upgrade(bridgeProxy.address, this.bridgeV3.address);
      const bridgeV3Implementation = new web3.eth.Contract(this.bridgeV3.abi, bridgeProxy.address);

      result = await bridgeV3Implementation.methods.version().call();
      assert.equal(result, 'v3');
    });

    it.only('should ReceiveTokensTo start in v2 finish in v3', async function () {
      const initializeDataBridgeV2 = await this.bridgeV2.contract.methods.initialize(bridgeManager, this.federator.address, this.allowTokensV0.address, this.sideTokenFactory.address, symbolPrefix).encodeABI();
      const bridgeProxy = await BridgeProxy.new(this.bridgeV2.address, this.proxyAdmin.address, initializeDataBridgeV2);
      const bridgeV2Implementation = new web3.eth.Contract(this.bridgeV2.abi, bridgeProxy.address);

      // let result = await bridgeV2Implementation.methods.version().call();
      const amount = toWei('1000');
      const originalTokenBalance = await this.token.balanceOf(tokenOwner);

      
      const tokenAllowed = await this.allowTokensV0.isTokenAllowed(this.token.address);
      assert.equal(tokenAllowed, true);
      let receipt = await this.token.approve(bridgeProxy.address, amount, { from: tokenOwner });
      utils.checkRcpt(receipt);
      const tokensReceived = await bridgeV2Implementation.methods.receiveTokens(this.token.address, amount).call({from: tokenOwner});
      assert.equal(tokensReceived, true);

      // await this.proxyAdmin.upgrade(bridgeProxy.address, this.bridgeV3.address);
      // const bridgeV3Implementation = new web3.eth.Contract(this.bridgeV3.abi, bridgeProxy.address);

      // result = await bridgeV3Implementation.methods.version().call();
      // assert.equal(result, 'v3');
    });
    // it('should maintain the same contract owner from Federation v2', async function () {
    //   const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
    //   const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
    //   const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

    //   const ownerV2 = await proxyFederationV2.methods.owner().call();
    //   assert.equal(ownerV2, deployer);

    //   await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
    //   const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

    //   const ownerV3 = await proxyFederation.methods.owner().call();
    //   assert.equal(ownerV2, ownerV3);
    // });

    // it('should not have setNFTBridge method before upgrade', async function () {
    //   const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
    //   const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
    //   const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

    //   assert.equal(proxyFederationV2.methods.setNFTBridge, undefined);
    // });

    // it('should have setNFTBridge method after update', async function () {
    //   const initData = await this.federationV2.contract.methods.initialize([federator1], 1, bridge, deployer).encodeABI();
    //   const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);

    //   await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
    //   const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

    //   await proxyFederation.methods.setNFTBridge(this.nftBridge.address).send({from: deployer});
    //   const nftBridgeSet = await proxyFederation.methods.bridgeNFT().call();
    //   assert.equal(nftBridgeSet, this.nftBridge.address);
    // });

    // it('should maintain the members from the Federation v2', async function () {
    //   const initialMembers  = [federator1, federator2];
    //   const initData = await this.federationV2.contract.methods.initialize(initialMembers, 1, bridge, deployer).encodeABI();
    //   const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initData);
    //   const proxyFederationV2 = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);

    //   let members = await proxyFederationV2.methods.getMembers().call();
    //   assert.equal(members.length, initialMembers.length);
    //   assert.equal(members[0], initialMembers[0]);
    //   assert.equal(members[1], initialMembers[1]);


    //   await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address)
    //   const proxyFederation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

    //   members = await proxyFederation.methods.getMembers().call();
    //   assert.equal(members.length, initialMembers.length);
    //   assert.equal(members[0], initialMembers[0]);
    //   assert.equal(members[1], initialMembers[1]);
    // });
  });
});
