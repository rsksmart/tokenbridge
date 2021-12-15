const ERC777 = artifacts.require('ERC777');
const BridgeV3 = artifacts.require('Bridge');
const BridgeV2 = artifacts.require('BridgeV2');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const SideTokenFactory = artifacts.require('SideTokenFactory');
const FederationV3 = artifacts.require('Federation');
const FederationV2 = artifacts.require('FederationV2');
const BridgeProxy = artifacts.require('BridgeProxy');
const FederationProxy = artifacts.require('FederationProxy');
const AllowTokens = artifacts.require('AllowTokens');
const AllowTokensV0 = artifacts.require('AllowTokensV0');
const NftBridge = artifacts.require('NFTBridge');
const UtilsV1 = artifacts.require('UtilsV1');
const utils = require("./utils");
const chains = require('../hardhat/helper/chains');
const MainToken = artifacts.require('./MainToken');
const toWei = web3.utils.toWei;

contract('Bridge Multichain Deploy Check', async function (accounts) {
  const bridgeManager = accounts[1];
  const federatorOwner = accounts[2];
  const federatorMember1 = accounts[3];
  const federatorMember2 = accounts[4];
  const allowTokensManager = accounts[5];
  const allowTokensPrimary = accounts[6];
  const tokenOwner = accounts[7];
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
    this.federationV2 = await FederationV2.new();
    this.federationV3 = await FederationV3.new();
    this.proxyAdmin = await ProxyAdmin.new();
    this.sideTokenFactory = await SideTokenFactory.new();
    
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

    it('should ReceiveTokensTo start in v2 finish in v3', async function () {
      const initialBalance = await this.token.contract.methods.balanceOf(tokenOwner).call();
      const initializeDataBridgeV2 = await this.bridgeV2.contract.methods.initialize(
        bridgeManager, 
        this.federationV2.address, 
        this.allowTokensV0.address, 
        this.sideTokenFactory.address, 
        symbolPrefix
      ).encodeABI();

      const initializeDataFederatorV2 = await this.federationV2.contract.methods.initialize(
        [federatorMember1, federatorMember2], 
        2, 
        this.bridgeV3.address, 
        federatorOwner
      ).encodeABI();
      
      const bridgeProxy = await BridgeProxy.new(this.bridgeV2.address, this.proxyAdmin.address, initializeDataBridgeV2);
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initializeDataFederatorV2);

      const bridgeV2Implementation = new web3.eth.Contract(this.bridgeV2.abi, bridgeProxy.address);
      const federationV2Implementation = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);
      
      await bridgeV2Implementation.methods.changeFederation(federationProxy.address).send({from: bridgeManager});
      await federationV2Implementation.methods.setBridge(bridgeProxy.address).send({from: federatorOwner});

      const amount = toWei('1000');
      
      const tokenAllowed = await this.allowTokensV0.isTokenAllowed(this.token.address);
      assert.equal(tokenAllowed, true);

      let receipt = await this.token.approve(bridgeProxy.address, amount, { from: tokenOwner });
      utils.checkRcpt(receipt);
      receipt = await bridgeV2Implementation.methods.receiveTokens(
        this.token.address, 
        amount
      ).send({from: tokenOwner});
      const crossEvent = receipt.events.Cross;
      
      const balanceAfterReceiveTokens = await this.token.contract.methods.balanceOf(tokenOwner).call();
      assert.equal(new web3.utils.BN(balanceAfterReceiveTokens).add(new web3.utils.BN(amount)).toString(), initialBalance);

      await federationV2Implementation.methods.voteTransaction(
        this.token.address, 
        tokenOwner, 
        tokenOwner, 
        amount, 
        crossEvent.blockHash, 
        crossEvent.transactionHash, 
        crossEvent.logIndex,
      ).send({from: federatorMember1});      
      
      await this.proxyAdmin.upgrade(bridgeProxy.address, this.bridgeV3.address);
      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address);

      const bridgeV3Implementation = new web3.eth.Contract(this.bridgeV3.abi, bridgeProxy.address);
      const federationV3Implementation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      await federationV3Implementation.methods.voteTransaction(
        this.token.address, 
        tokenOwner, 
        tokenOwner, 
        amount, 
        crossEvent.blockHash, 
        crossEvent.transactionHash, 
        crossEvent.logIndex,
        utils.tokenType.COIN,
        chains.ETHEREUM_MAIN_NET_CHAIN_ID,
        chains.HARDHAT_TEST_NET_CHAIN_ID,
      ).send({from: federatorMember2});      
      
      await bridgeV3Implementation.methods.claim(
        {
          to: tokenOwner,
          amount: amount,
          blockHash: crossEvent.blockHash, 
          transactionHash: crossEvent.transactionHash,
          logIndex: crossEvent.logIndex,
          originChainId: chains.ETHEREUM_MAIN_NET_CHAIN_ID,
        },
      ).send({from: tokenOwner});
      
      const originalTokenAddress = await bridgeV3Implementation.methods.originalTokenAddresses(crossEvent.transactionHash).call();
      const originalTokenContract = new web3.eth.Contract(ERC777.abi, originalTokenAddress );

      const balance = await originalTokenContract.methods.balanceOf(tokenOwner).call();
      assert.equal(initialBalance, balance);
    });
  });
});
