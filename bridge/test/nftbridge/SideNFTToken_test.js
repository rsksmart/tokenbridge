const SideToken = artifacts.require("./SideNFTToken");
const utils = require("../utils");
const truffleAssert = require("truffle-assertions");
const keccak256 = web3.utils.keccak256;
const ethUtil = require('ethereumjs-util');

contract("SideNFTToken", async function(accounts) {
  const tokenCreator = accounts[0];
  const anotherAccount = accounts[2];
  const tokenOwner = accounts[4];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";
  const tokenBaseURI = "ipfs:/";
  const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";

  describe("constructor", async function() {
    it("should create side token", async function() {
      let token = await SideToken.new(
        tokenName,
        tokenSymbol,
        tokenCreator,
        tokenBaseURI,
        tokenContractURI
      );
      assert.isNotEmpty(token.address);
    });

    it("should fail empty minter address", async function() {
      await truffleAssert.fails(
        SideToken.new(
          tokenName,
          tokenSymbol,
          utils.NULL_ADDRESS,
          tokenBaseURI,
          tokenContractURI
        ),
        "Empty Minter",
        "SideToken: Empty Minter"
      );
    });

    describe("methods", async function() {

      beforeEach(async function() {
        this.token = await SideToken.new(
          tokenName,
          tokenSymbol,
          tokenCreator,
          tokenBaseURI,
          tokenContractURI
        );
      });

      it("should check the contract URI", async function() {
        const currentContractURI = await this.token.contractURI();
        assert.equal(currentContractURI, tokenContractURI);
      });

      it('should fail the approval was for the current owner', async function () {
        const tokenId = 4;
        const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
        await this.token.mint(accountWallet.address, tokenId);

        const nonce = (await this.token.nonces(accountWallet.address)).toString();
        const deadline = Number.MAX_SAFE_INTEGER.toString();
        const digest = await getApprovalDigest(
          this.token,
          { owner: accountWallet.address, spender: anotherAccount, value: tokenId },
          nonce,
          deadline
        );

        const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

        await truffleAssert.fails(
          this.token.permit(
            accountWallet.address,
            tokenId,
            deadline,
            v,
            r,
            s
          ),
          truffleAssert.ErrorType.REVERT,
          'ERC721Permit: approval'
        );
      });

      it.only('should permit and emit Approval', async function () {
        const tokenId = 4;
        const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
        const resultMint = await this.token.mint(accountWallet.address, tokenId);

        const nonce = (await this.token.nonces(accountWallet.address)).toString();
        const deadline = Number.MAX_SAFE_INTEGER.toString();
        const digest = await getApprovalDigest(
          this.token,
          { owner: accountWallet.address, spender: anotherAccount, value: tokenId },
          nonce,
          deadline
        );

        const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

        const receipt = await this.token.permit(
          anotherAccount,
          tokenId,
          deadline,
          v,
          r,
          s
        );

        truffleAssert.eventEmitted(receipt, 'Approval', (ev) => {
          return ev.owner === accountWallet.address
          && ev.spender === anotherAccount
          && ev.value.toString() === amount
        });

        // expect((await this.token.allowance(accountWallet.address, anotherAccount)).toString()).to.eq(amount);
        // expect((await this.token.nonces(accountWallet.address)).toString()).to.eq('1');
      })
    });
  });

  async function getApprovalDigest(
    token,
    approve, //{owner: string, spender: string, value: BigNumber},
    nonce,
    deadline
  ) {
    const PERMIT_TYPEHASH = await token.PERMIT_TYPEHASH();
    const DOMAIN_SEPARATOR = await token.domainSeparator();
    return web3.utils.soliditySha3(
      {t:'bytes1', v:'0x19'},
      {t:'bytes1', v:'0x01'},
      {t:'bytes32', v:DOMAIN_SEPARATOR},
      {t:'bytes32', v:keccak256(
          web3.eth.abi.encodeParameters(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        )
      }
    );
  }

});
