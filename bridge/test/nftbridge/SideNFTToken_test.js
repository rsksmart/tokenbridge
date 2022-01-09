const SideToken = artifacts.require("./SideNFTToken");
const utils = require("../utils");
const truffleAssert = require("truffle-assertions");

contract("SideNFTToken", async function(accounts) {
  const tokenCreator = accounts[0];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";
  const tokenBaseURI = "ipfs:/";
  const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";

  describe("constructor", async function() {
    it("should create side token", async function() {
      const token = await SideToken.new(
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
    });
  });
});
