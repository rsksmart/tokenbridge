const FederationV2 = artifacts.require('FederationV2');
const Federation = artifacts.require('Federation');
const FederationProxy = artifacts.require('FederationProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const utils = require('../utils');

contract('Federation', async function (accounts) {
  const deployer = accounts[0];
  const federator1 = accounts[2];
  const federator2 = accounts[3];
  const bridge = utils.getRandomAddress();

  describe('Upgrate from FederationV2 to Federation', async function () {

    it.only('should mantain the members from the Federator v2', async function () {
      this.members  = [federator1, federator2];
      const federationV2 = await FederationV2.new();
      const proxyAdmin = await ProxyAdmin.new();
      const initData = await federationV2.contract.methods.initialize(this.members, 1, bridge, deployer).encodeABI();
      const federationProxy = await FederationProxy.new(federationV2.address, proxyAdmin.address, initData);
      const proxyFederationV2 = new web3.eth.Contract(federationV2.abi, federationProxy.address);

      let members = await proxyFederationV2.methods.getMembers().call();
      assert.equal(members.length, this.members.length);
      assert.equal(members[0], this.members[0]);
      assert.equal(members[1], this.members[1]);

      let owner = await proxyFederationV2.methods.owner().call();
      assert.equal(owner, deployer);
      let result = await proxyFederationV2.methods.version().call();
      assert.equal(result, 'v2');

      const federation = await Federation.new();
      await proxyAdmin.upgrade(federationProxy.address, federation.address)
      const proxyFederation = new web3.eth.Contract(federation.abi, federationProxy.address);
      result = await proxyFederation.methods.version().call();
      assert.equal(result, 'v3');

      members = await proxyFederation.methods.getMembers().call();
      assert.equal(members.length, this.members.length);
      assert.equal(members[0], this.members[0]);
      assert.equal(members[1], this.members[1]);
    });
  });
});
6