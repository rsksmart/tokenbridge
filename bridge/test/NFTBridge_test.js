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
  const newBridgeManager = accounts[4];
  const federation = accounts[5];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";
  const tokenBaseURI = "ipfs:/";
  const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";
  const sideTokenSymbolPrefix = "e";
  const newSideNFTTokenEventType = "NewSideNFTToken";

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
    this.token.setContractURI(tokenContractURI);

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

    it('should retrieve the version', async function () {
      const result = await this.bridgeNft.version();
      assert.equal(result, "v1");
    });

    describe("owner", async function() {

      it('check manager', async function () {
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, bridgeManager);
      });

      it('change manager', async function () {
        const receipt = await this.bridgeNft.transferOwnership(newBridgeManager, { from: bridgeManager });
        utils.checkRcpt(receipt);
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, newBridgeManager);
      });

      it('only manager can change manager', async function () {
        truffleAssert.fails(
          this.bridgeNft.transferOwnership(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          'Ownable: caller is not the owner',
        );
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, bridgeManager);
      });

      it('check federation', async function () {
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });

      it('change federation', async function () {
        const receipt = await this.bridgeNft.changeFederation(newBridgeManager, { from: bridgeManager });
        utils.checkRcpt(receipt);
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, newBridgeManager);
      });

      it('only manager can change the federation', async function () {
        truffleAssert.fails(
          this.bridgeNft.changeFederation(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          'Ownable: caller is not the owner',
        );
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });

      it('change federation new fed cant be null', async function () {
        truffleAssert.fails(
          this.bridgeNft.changeFederation(utils.NULL_ADDRESS, { from: bridgeManager }),
          truffleAssert.ErrorType.REVERT,
          'Bridge: Federation is empty',
        );
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });

    });

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
          let contractURI;
          let tokenAddress;

          beforeEach(async function() {
              symbol = await this.token.symbol();
              name = await this.token.name();
              baseURI = await this.token.baseURI();
              contractURI = await this.token.contractURI();
              tokenAddress = this.token.address;
          });

          it("creates token correctly and emits expected event when inputs are correct", async function () {
              let receipt = await executeSideNFTTokenCreationTransaction.call(
                  this, tokenAddress, symbol, name, baseURI, contractURI, bridgeManager
              );

              utils.checkRcpt(receipt);
              let newSideNFTTokenAddress;
              truffleAssert.eventEmitted(receipt, newSideNFTTokenEventType, (event) => {
                  newSideNFTTokenAddress = event._newSideNFTTokenAddress;
                  return event._originalTokenAddress === tokenAddress &&
                      event._newSymbol === `${sideTokenSymbolPrefix}${tokenSymbol}`
              });
              let newSideNFTToken = await NFTERC721TestToken.at(newSideNFTTokenAddress);
              const newSideNFTTokenBaseURI = await newSideNFTToken.baseURI();
              assert.equal(baseURI, newSideNFTTokenBaseURI);

              let sideTokenAddressMappedByBridge = await this.bridgeNft.sideTokenAddressByOriginalTokenAddress(tokenAddress);
              assert.equal(newSideNFTTokenAddress, sideTokenAddressMappedByBridge);

              let tokenAddressMappedByBridge = await this.bridgeNft.originalTokenAddressBySideTokenAddress(newSideNFTTokenAddress);
              assert.equal(tokenAddress, tokenAddressMappedByBridge);
          });

          function executeSideNFTTokenCreationTransaction(tokenAddress, symbol, name, baseURI, contractURI, bridgeManager) {
              return this.bridgeNft.createSideNFTToken(
                  tokenAddress,
                  symbol,
                  name,
                  baseURI,
                  contractURI,
                  {
                      from: bridgeManager,
                  }
              );
          }

          it("fails to create side NFT token if the original token address is a null address", async function () {
              const expectedErrorReason = "Bridge: Null original token address";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, utils.NULL_ADDRESS, symbol, name, baseURI, contractURI, bridgeManager
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

          it("fails to create side NFT token if side token address already exists", async function () {
              let receipt = await executeSideNFTTokenCreationTransaction.call(
                  this, tokenAddress, symbol, name, baseURI, contractURI, bridgeManager
              );

              truffleAssert.eventEmitted(receipt, newSideNFTTokenEventType);

              const expectedErrorReason = "Bridge: Side token already exists";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, tokenAddress, symbol, name, baseURI, contractURI, bridgeManager
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

          it("fails to create side NFT token if transaction sender is not bridge manager", async function () {
              const expectedErrorReason = "Ownable: caller is not the owner";

              let error = await utils.expectThrow(
                  executeSideNFTTokenCreationTransaction.call(
                      this, tokenAddress, symbol, name, baseURI, contractURI, anAccount
                  )
              );

              assert.equal(expectedErrorReason, error.reason);
          });

      });

  });
});
