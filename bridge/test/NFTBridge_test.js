const NFTERC721TestToken = artifacts.require("./NFTERC721TestToken");
const NftBridge = artifacts.require("./NFTBridge");
const AllowTokens = artifacts.require("./AllowTokens");
const SideNFTTokenFactory = artifacts.require("./SideNFTTokenFactory");

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
  const sideTokenSymbolPrefix = "e";
  const nullAddress = "0x0000000000000000000000000000000000000000";
  const newSideTokenEventType = "NewSideToken";

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

    this.sideTokenFactory = await SideNFTTokenFactory.new();
    this.bridgeNft = await NftBridge.new();

    await this.bridgeNft.methods[
      "initialize(address,address,address,address,string)"
    ](
      bridgeManager,
      federation,
      this.allowTokens.address,
      this.sideTokenFactory.address,
      sideTokenSymbolPrefix
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

      describe("createSideNFTToken", async function () {

          let symbol;
          let name;
          let baseURI;
          let tokenAddress;

          beforeEach(async function() {
              symbol = await this.token.symbol();
              name = await this.token.name();
              baseURI = await this.token.baseURI();
              tokenAddress = this.token.address;
          });

          it("creates token correctly and emits expected event when inputs are correct", async function () {
              let receipt = await executeSideNFTTokenCreationTransaction.call(
                  this, tokenAddress, symbol, name, baseURI, bridgeManager
              );

              utils.checkRcpt(receipt);
              let newSideTokenAddress;
              truffleAssert.eventEmitted(receipt, newSideTokenEventType, (event) => {
                  newSideTokenAddress = event._newSideTokenAddress;
                  return event._originalTokenAddress === tokenAddress &&
                      event._newSymbol === `${sideTokenSymbolPrefix}${tokenSymbol}`
              });
              let newSideToken = await NFTERC721TestToken.at(newSideTokenAddress);
              const newSideTokenBaseURI = await newSideToken.baseURI();
              assert.equal(baseURI, newSideTokenBaseURI);

              let sideTokenAddressMappedByBridge = await this.bridgeNft.sideTokenAddressByOriginalTokenAddress(tokenAddress);
              assert.equal(newSideTokenAddress, sideTokenAddressMappedByBridge);

              let tokenAddressMappedByBridge = await this.bridgeNft.originalTokenAddressBySideTokenAddress(newSideTokenAddress);
              assert.equal(tokenAddress, tokenAddressMappedByBridge);
          });

          function executeSideNFTTokenCreationTransaction(tokenAddress, symbol, name, baseURI, bridgeManager) {
              return this.bridgeNft.createSideNFTToken(
                  tokenAddress,
                  symbol,
                  name,
                  baseURI,
                  {
                      from: bridgeManager,
                  }
              );
          }

          it("fails to create side NFT token if the original token address is a null address", async function () {
              const expectedErrorReason = "Bridge: Null original token address";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, nullAddress, symbol, name, baseURI, bridgeManager
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

          it("fails to create side NFT token if side token address already exists", async function () {
              let receipt = await executeSideNFTTokenCreationTransaction.call(
                  this, tokenAddress, symbol, name, baseURI, bridgeManager
              );

              truffleAssert.eventEmitted(receipt, newSideTokenEventType);

              const expectedErrorReason = "Bridge: Side token already exists";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, tokenAddress, symbol, name, baseURI, bridgeManager
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

          it("fails to create side NFT token if transaction sender is not bridge manager", async function () {
              const expectedErrorReason = "Ownable: caller is not the owner";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, tokenAddress, symbol, name, baseURI, anAccount
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

      });

  });
});
