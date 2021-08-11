const NFTERC721TestToken = artifacts.require("./NFTERC721TestToken");
const NftBridge = artifacts.require("./NFTBridge");
const AllowTokens = artifacts.require("./AllowTokens");
const SideTokenFactory = artifacts.require("./SideTokenFactory");

const utils = require("./utils");
const truffleAssert = require("truffle-assertions");

const toWei = web3.utils.toWei;

contract("Bridge NFT", async function(accounts) {
  const bridgeOwner = accounts[0];
  const tokenOwner = accounts[1];
  const bridgeManager = accounts[2];
  const anAccount = accounts[3];
  const federation = accounts[5];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";
  const tokenBaseURI = "ipfs:/";

  before(async function() {
    await utils.saveState();
  });

  after(async function() {
    await utils.revertState();
  });

  beforeEach(async function() {
    this.token = await NFTERC721TestToken.new(tokenName, tokenSymbol, {
      from: tokenOwner,
    });
    this.token.setBaseURI(tokenBaseURI);

    this.allowTokens = await AllowTokens.new();
    await this.allowTokens.methods[
      "initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])"
    ](bridgeManager, bridgeOwner, "0", "0", "0", [
      {
        description: "MAIN",
        limits: {
          max: toWei("10000"),
          min: toWei("1"),
          daily: toWei("100000"),
          mediumAmount: toWei("2"),
          largeAmount: toWei("3"),
        },
      },
    ]);

    this.typeId = 0;
    await this.allowTokens.setToken(this.token.address, this.typeId, {
      from: bridgeManager,
    });

    this.sideTokenFactory = await SideTokenFactory.new();
    this.bridgeNft = await NftBridge.new();

    await this.bridgeNft.methods[
      "initialize(address,address,address,address,string)"
    ](
      bridgeManager,
      federation,
      this.allowTokens.address,
      this.sideTokenFactory.address,
      "e"
    );

    await this.sideTokenFactory.transferPrimary(this.bridgeNft.address);
    await this.allowTokens.transferPrimary(this.bridgeNft.address, {
      from: bridgeOwner,
    });
  });

  describe("Main NFT network", async function() {
    describe("receiveTokensTo", async function() {
      it("receives ERC721 NFT correctly", async function() {
        const tokenId = 9;
        const tokenURI = "/ipfs/QmYBX4nZfrHMPFUD9CJcq82Pexp8bpgtf89QBwRNtDQihS";
        let totalSupply = 0; // is the amount of nft minted

        let receipt = await this.token.safeMint(tokenOwner, tokenId, {
          from: tokenOwner,
        });
        utils.checkRcpt(receipt);
        totalSupply++;

        receipt = await this.token.setTokenURI(tokenId, tokenURI);
        utils.checkRcpt(receipt);

        receipt = await this.token.approve(this.bridgeNft.address, tokenId, {
          from: tokenOwner,
        });
        utils.checkRcpt(receipt);

        receipt = await this.bridgeNft.receiveTokensTo(
          this.token.address,
          anAccount,
          tokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          console.log(ev);

          return (
            ev._tokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._amount == totalSupply &&
            ev._tokenId == tokenId &&
            ev._tokenURI == tokenBaseURI + tokenURI
          );
        });
      });
    });
  });
});
