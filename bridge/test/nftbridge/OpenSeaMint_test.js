/* libraries used */
const { toBN } = require('web3-utils')
const utils = require('../utils');

/* Contracts in this test */
const OpenSea721 = artifacts.require('./OpenSea721.sol');

contract('Interaction with OpenSea721', (accounts) => {
  const NAME = 'ERC-271 Test Contract';
  const SYMBOL = 'ERC71Test';

  const owner = accounts[0];
  const otherAccount = accounts[1];
  const userA = accounts[2];


  let instance;
  // Keep track of token ids as we progress through the tests, rather than
  // hardcoding numbers that we will have to change if we add/move tests.
  // For example if test A assumes that it will create token ID 1 and test B
  // assumes that it will create token 2, changing test A later so that it
  // creates another token will break this as test B will now create token ID 3.
  // Doing this avoids this scenario.
  let tokenId = 0;

  before(async () => {
    instance = await OpenSea721.new(NAME, SYMBOL);
  });

  describe('safeTransferFrom()', () => {
    it('should transfer the tokens to SmartWallet called by the owner', async () => {
      await instance.mintTo(owner)
      tokenId++;
      const previousBalance = await instance.balanceOf(userA);

      await instance.safeTransferFrom(owner, userA, tokenId, '0x');
      const newBalance = await instance.balanceOf(userA);
      assert.equal(previousBalance.add(toBN(1)).toString(), newBalance.toString());
    });
    it('should fail transfer the tokens called by other account without approval', async () => {
      await instance.mintTo(owner)
      tokenId++;
      await utils.expectThrow(
        instance.safeTransferFrom(owner, userA, tokenId, '0x', {from: otherAccount}),
        'ERC1155: caller is not owner nor approved'
      );
    });
    it('should transfer the tokens called by other account with approval', async () => {
      await instance.mintTo(owner)
      tokenId++;
      const previousBalance = await instance.balanceOf(otherAccount);
      await instance.setApprovalForAll(otherAccount, true)
      assert.ok(await instance.isApprovedForAll(owner, otherAccount));

      await instance.safeTransferFrom(owner, otherAccount, tokenId, {from: otherAccount});
      const newBalance = await instance.balanceOf(otherAccount);
      assert.equal(previousBalance.add(toBN(1)).toString(), newBalance.toString());
    });
  });

});
