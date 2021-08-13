const SideToken = artifacts.require("./SideNFTToken");

const truffleAssert = require("truffle-assertions");

contract("SideNFTToken", async function(accounts) {
  const tokenCreator = accounts[0];
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
      truffleAssert.fails(
        SideToken.new(
          tokenName,
          tokenSymbol,
          "0x",
          tokenBaseURI,
          tokenContractURI
        ),
        'invalid address',
        "SideToken: Empty Minter"
      );
    });
  });

  // TODO: add tests associated to permit (SideToken_test.js for reference).
});
