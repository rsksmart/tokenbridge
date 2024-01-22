const ERC777 = artifacts.require('ERC777');
const BridgeV4 = artifacts.require('BridgeV3');
const BridgeV3 = artifacts.require('BridgeV3');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const SideTokenFactory = artifacts.require('SideTokenFactory');
const FederationV3 = artifacts.require('FederationV3');
const FederationV2 = artifacts.require('FederationV2');
const BridgeProxy = artifacts.require('BridgeProxy');
const FederationProxy = artifacts.require('FederationProxy');
const AllowTokens = artifacts.require('AllowTokensV1');
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
    this.bridgeV3 = await BridgeV3.new();
    this.bridgeV4 = await BridgeV4.new();
    this.allowTokens = await AllowTokens.new();

    this.federationV2 = await FederationV2.new();
    this.federationV3 = await FederationV3.new();
    this.proxyAdmin = await ProxyAdmin.new();
    this.sideTokenFactory = await SideTokenFactory.new();

    await this.allowTokens.initialize(allowTokensManager, allowTokensPrimary, 1, 1, 1, [
      { description: 'BTC', limits: {
          min:toWei('0.0000001'),
          max:toWei('2500'),
          daily:toWei('100000'),
          mediumAmount:toWei('100'),
          largeAmount:toWei('10000') }
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
    await this.allowTokens.setToken(this.token.address, 0, { from: allowTokensManager });
  });

  describe('Upgrate from BridgeV3 to BridgeV4', async function () {
    it('should update the contract version from v3 to v4', async function () {
      const initializeDataBridgeV3 = await this.bridgeV3.contract.methods.initialize(
        bridgeManager,
        this.federationV2.address,
        this.allowTokens.address,
        this.sideTokenFactory.address,
        symbolPrefix
      ).encodeABI();
      const bridgeProxy = await BridgeProxy.new(this.bridgeV3.address, this.proxyAdmin.address, initializeDataBridgeV3);
      const bridgeV3Implementation = new web3.eth.Contract(this.bridgeV3.abi, bridgeProxy.address);

      let result = await bridgeV3Implementation.methods.version().call();
      assert.equal(result, 'v3');

      await this.proxyAdmin.upgrade(bridgeProxy.address, this.bridgeV4.address);
      const bridgeV4Implementation = new web3.eth.Contract(this.bridgeV4.abi, bridgeProxy.address);

      result = await bridgeV4Implementation.methods.version().call();
      assert.equal(result, 'v3');
    });

    it('should ReceiveTokensTo start in v3 finish in v4', async function () {
      const initialBalance = await this.token.contract.methods.balanceOf(tokenOwner).call();
      const initializeDataBridgeV3 = await this.bridgeV3.contract.methods.initialize(
        bridgeManager,
        this.federationV2.address,
        this.allowTokens.address,
        this.sideTokenFactory.address,
        symbolPrefix
      ).encodeABI();
      console.log('initialize bridge v3')

      const initializeDataFederatorV2 = await this.federationV2.contract.methods.initialize(
        [federatorMember1, federatorMember2],
        2,
        this.bridgeV4.address,
        federatorOwner
      ).encodeABI();
      console.log('initialize federator v2')

      const bridgeProxy = await BridgeProxy.new(this.bridgeV3.address, this.proxyAdmin.address, initializeDataBridgeV3);
      const federationProxy = await FederationProxy.new(this.federationV2.address, this.proxyAdmin.address, initializeDataFederatorV2);

      const bridgeV3Implementation = new web3.eth.Contract(this.bridgeV3.abi, bridgeProxy.address);
      const federationV2Implementation = new web3.eth.Contract(this.federationV2.abi, federationProxy.address);
      console.log('set bridge v3')

      await bridgeV3Implementation.methods.changeFederation(federationProxy.address).send({from: bridgeManager});
      await federationV2Implementation.methods.setBridge(bridgeProxy.address).send({from: federatorOwner});
      await this.allowTokens.transferPrimary(bridgeProxy.address, {from: allowTokensPrimary});

      const amount = toWei('1000');
      console.log('is tokenAllowed v2')

      const tokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
      assert.equal(tokenAllowed, true);

      let receipt = await this.token.approve(bridgeProxy.address, amount, { from: tokenOwner });
      utils.checkRcpt(receipt);
      receipt = await bridgeV3Implementation.methods.receiveTokensTo(
        this.token.address,
        tokenOwner,
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

      await this.proxyAdmin.upgrade(bridgeProxy.address, this.bridgeV4.address);
      await this.proxyAdmin.upgrade(federationProxy.address, this.federationV3.address);

      const bridgeV4Implementation = new web3.eth.Contract(this.bridgeV4.abi, bridgeProxy.address);
      const federationV3Implementation = new web3.eth.Contract(this.federationV3.abi, federationProxy.address);

      await federationV3Implementation.methods.voteTransaction(
        this.token.address,
        tokenOwner,
        tokenOwner,
        amount,
        crossEvent.blockHash,
        crossEvent.transactionHash,
        crossEvent.logIndex
      ).send({from: federatorMember2});

      await bridgeV4Implementation.methods.claim(
        {
          to: tokenOwner,
          amount: amount,
          blockHash: crossEvent.blockHash,
          transactionHash: crossEvent.transactionHash,
          logIndex: crossEvent.logIndex,
          originChainId: chains.ETHEREUM_MAIN_NET_CHAIN_ID,
        },
      ).send({from: tokenOwner});

      const originalTokenAddress = await bridgeV4Implementation.methods.originalTokenAddresses(crossEvent.transactionHash).call();
      const originalTokenContract = new web3.eth.Contract(ERC777.abi, originalTokenAddress );

      const balance = await originalTokenContract.methods.balanceOf(tokenOwner).call();
      assert.equal(initialBalance, balance);
    });
  });
});
