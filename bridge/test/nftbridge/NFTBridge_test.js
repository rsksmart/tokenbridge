const NFTERC721TestToken = artifacts.require("./NFTERC721TestToken");
const NftBridge = artifacts.require("./NFTBridge");
const TestTokenCreator = artifacts.require("./TestTokenCreator");
const AllowTokens = artifacts.require("./AllowTokens");
const SideNFTTokenFactory = artifacts.require("./SideNFTTokenFactory");
const IERC721 = artifacts.require("./IERC721");

const utils = require("../utils");
const truffleAssert = require("truffle-assertions");
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

contract("Bridge NFT", async function(accounts) {
  const bridgeOwner = accounts[0];
  const tokenOwner = accounts[1];
  const bridgeManager = accounts[2];
  const anAccount = accounts[3];
  const newBridgeManager = accounts[4];
  const federation = accounts[5];
  const anotherAccount = accounts[6];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";
  const tokenBaseURI = "ipfs:/";
  const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";
  const sideTokenSymbolPrefix = "e";
  const newSideNFTTokenEventType = "NewSideNFTToken";
  const defaultTokenId = 9;
  const defaultTokenURI = "/ipfs/QmYBX4nZfrHMPFUD9CJcq82Pexp8bpgtf89QBwRNtDQihS";
  const acceptedNFTCrossTransferEventType = "AcceptedNFTCrossTransfer";
  const claimedNFTTokenEventType = "ClaimedNFTToken";
  const crossEventType = "Cross";
  const bigNumberZero = new BN(0);
  const bigNumberOne = new BN(1);

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
    this.mainChainSideTokenFactory = await SideNFTTokenFactory.new();
    this.NFTBridge = await NftBridge.new();
    this.sideNFTBridge = await NftBridge.new();
    this.sideChainSideTokenFactory = await SideNFTTokenFactory.new();

    await this.NFTBridge.methods[
      "initialize(address,address,address,address,string)"
    ](
      bridgeManager,
      federation,
      this.allowTokens.address,
      this.mainChainSideTokenFactory.address,
      sideTokenSymbolPrefix
    );

    await this.sideNFTBridge.methods[
        "initialize(address,address,address,address,string)"
        ](
        bridgeManager,
        federation,
        this.allowTokens.address,
        this.sideChainSideTokenFactory.address,
        sideTokenSymbolPrefix
    );

    await this.mainChainSideTokenFactory.transferPrimary(this.NFTBridge.address);
    await this.sideChainSideTokenFactory.transferPrimary(this.sideNFTBridge.address);
    await this.allowTokens.transferPrimary(this.NFTBridge.address, {
      from: bridgeOwner,
    });
  });

  const mintAndApprove = async (
    token,
    approveTo,
    tokenId = defaultTokenId,
    owner = tokenOwner
  ) => {
    let receipt = await token.safeMint(owner, tokenId, {
      from: owner,
    });
    utils.checkRcpt(receipt);

    receipt = await token.approve(approveTo, tokenId, {
      from: owner,
    });
    utils.checkRcpt(receipt);
  };

  describe("Main NFT network", async function() {
    it("should retrieve the version", async function() {
      const result = await this.NFTBridge.version();
      assert.equal(result, "v1");
    });

    it("should call the token creator", async function () {
      const testTokenCreator = await TestTokenCreator.new({ from: anAccount });
      const tokenCreator = await this.NFTBridge.getTokenCreator(testTokenCreator.address, defaultTokenId);
      assert.equal(tokenCreator, anAccount);
    });

    it("should change the Allow Tokens", async function() {
      const newAllowTokens = await AllowTokens.new();
      const receipt = await this.NFTBridge.changeAllowTokens(newAllowTokens.address, { from: bridgeManager });
      truffleAssert.eventEmitted(receipt, "AllowTokensChanged", (ev) => {
        return (
          ev._newAllowTokens == newAllowTokens.address
        );
      });
    });

    it("should set the NFT bridge as upgrade", async function() {
      const receipt = await this.NFTBridge.setUpgrading(true, { from: bridgeManager });
      truffleAssert.eventEmitted(receipt, "Upgrading", (ev) => {
        return (
          ev._isUpgrading
        );
      });
    });

    it("should change the Side Token Factory", async function() {
      const newSideTokenFactory = await SideNFTTokenFactory.new();
      const receipt = await this.NFTBridge.changeSideTokenFactory(newSideTokenFactory.address, { from: bridgeManager });
      truffleAssert.eventEmitted(receipt, "SideTokenFactoryChanged", (ev) => {
        return (
          ev._newSideNFTTokenFactory == newSideTokenFactory.address
        );
      });
    });

    it("should get the received selector", async function() {
      const receipt = await this.NFTBridge.onERC721Received(bridgeOwner, tokenOwner, defaultTokenId, 0);
      utils.checkRcpt(receipt);
    });

    describe("owner", async function() {
      it("check manager", async function() {
        const manager = await this.NFTBridge.owner();
        assert.equal(manager, bridgeManager);
      });

      it("change manager", async function() {
        const receipt = await this.NFTBridge.transferOwnership(
          newBridgeManager,
          { from: bridgeManager }
        );
        utils.checkRcpt(receipt);
        const manager = await this.NFTBridge.owner();
        assert.equal(manager, newBridgeManager);
      });

      it("only manager can change manager", async function() {
        await truffleAssert.fails(
          this.NFTBridge.transferOwnership(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          "Ownable: caller is not the owner"
        );
        const manager = await this.NFTBridge.owner();
        assert.equal(manager, bridgeManager);
      });

      it("check federation", async function() {
        const federationAddress = await this.NFTBridge.getFederation();
        assert.equal(federationAddress, federation);
      });

      it("change federation", async function() {
        const receipt = await this.NFTBridge.changeFederation(
          newBridgeManager,
          { from: bridgeManager }
        );
        utils.checkRcpt(receipt);
        const federationAddress = await this.NFTBridge.getFederation();
        assert.equal(federationAddress, newBridgeManager);
      });

      it("only manager can change the federation", async function() {
        await truffleAssert.fails(
          this.NFTBridge.changeFederation(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          "Ownable: caller is not the owner"
        );
        const federationAddress = await this.NFTBridge.getFederation();
        assert.equal(federationAddress, federation);
      });

      it("change federation new fed cant be null", async function() {
        await truffleAssert.fails(
          this.NFTBridge.changeFederation(utils.NULL_ADDRESS, {
            from: bridgeManager,
          }),
          truffleAssert.ErrorType.REVERT,
          "Bridge: Federation is empty"
        );
        const federationAddress = await this.NFTBridge.getFederation();
        assert.equal(federationAddress, federation);
      });
    });

    describe("receiveTokensTo", async function() {
      it("receives ERC721 NFT correctly with token URI", async function() {
        let totalSupply = 0; // is the amount of nft minted

        await mintAndApprove(this.token, this.NFTBridge.address);
        totalSupply++;

        let receipt = await this.token.setTokenURI(defaultTokenId, defaultTokenURI);
        utils.checkRcpt(receipt);

        receipt = await this.NFTBridge.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          // console.log(ev);

          return (
            ev._originalTokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._totalSupply == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == tokenBaseURI + defaultTokenURI
          );
        });
      });

      it("receives ERC721 NFT correctly with base URI and without token URI set", async function() {
        let totalSupply = 0;

        await mintAndApprove(this.token, this.NFTBridge.address);
        totalSupply++;

        let receipt = await this.NFTBridge.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._originalTokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._totalSupply == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == tokenBaseURI + defaultTokenId
          );
        });
      });

      it("receives ERC721 NFT correctly without token and base URI set", async function() {
        let totalSupply = 0;

        await this.token.setBaseURI('');
        await mintAndApprove(this.token, this.NFTBridge.address);
        totalSupply++;

        let receipt = await this.NFTBridge.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._originalTokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._totalSupply == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == ''
          );
        });
      });

      it("receives ERC721 NFT correctly with token URI and without base URI", async function() {
        let totalSupply = 0;

        await this.token.setBaseURI('');
        await mintAndApprove(this.token, this.NFTBridge.address);
        totalSupply++;

        let receipt = await this.token.setTokenURI(defaultTokenId, defaultTokenURI);
        utils.checkRcpt(receipt);

        receipt = await this.NFTBridge.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._originalTokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._totalSupply == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == defaultTokenURI
          );
        });
      });

      describe("fixed fee", async function() {
        it("should send fee to federator correctly", async function() {
          const fixedFee = new BN("15");
          let receipt = await this.NFTBridge.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          const setFixedFee = await this.NFTBridge.getFixedFee();
          assert(
            fixedFee.eq(setFixedFee),
            "It should have the same fixed fee"
          );
          await mintAndApprove(this.token, this.NFTBridge.address);

          const tokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.NFTBridge.receiveTokensTo(
            this.token.address,
            anAccount,
            defaultTokenId,
            {
              from: tokenOwner,
              value: fixedFee,
            }
          );
          utils.checkRcpt(tx);

          const currentTokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const expectedTokenOwnerBalance = tokenOwnerBalance
            .sub(fixedFee)
            .sub(await utils.getGasUsedByTx(tx));

          assert(
            currentTokenOwnerBalance.eq(expectedTokenOwnerBalance),
            "Token Owner Balance should be balance - (fixedFee + gas Used)"
          );

          const currentFederatorBalance = await utils.getEtherBalance(federation);
          const expectedFederatorBalance = federatorBalance.add(fixedFee);

          assert(
            currentFederatorBalance.eq(expectedFederatorBalance),
            "Federator Balance should be balance + fixedFee"
          );
        });

        it("should send fixed fee + 10 to federator correctly and the remaining value sent it back to the sender", async function() {
          const fixedFee = new BN("15");
          let receipt = await this.NFTBridge.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await mintAndApprove(this.token, this.NFTBridge.address);

          const tokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.NFTBridge.receiveTokensTo(
            this.token.address,
            anAccount,
            defaultTokenId,
            {
              from: tokenOwner,
              value: fixedFee.add(new BN("10")),
            }
          );
          utils.checkRcpt(tx);

          const currentTokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const expectedTokenOwnerBalance = tokenOwnerBalance
            .sub(fixedFee)
            .sub(await utils.getGasUsedByTx(tx));

          assert(
            currentTokenOwnerBalance.eq(expectedTokenOwnerBalance),
            "Token Owner Balance should be balance - (fixedFee + gas Used)"
          );

          const currentFederatorBalance = await utils.getEtherBalance(federation);
          const expectedFederatorBalance = federatorBalance.add(fixedFee);

          assert(
            currentFederatorBalance.eq(expectedFederatorBalance),
            "Federator Balance should be balance + fixedFee"
          );
        });

        it("should reamin the same balance for the Federator, because the fixed fee is zero", async function() {
          let receipt = await this.NFTBridge.setFixedFee(bigNumberZero, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await mintAndApprove(this.token, this.NFTBridge.address);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.NFTBridge.receiveTokensTo(
            this.token.address,
            anAccount,
            defaultTokenId,
            {
              from: tokenOwner
            }
          );
          utils.checkRcpt(tx);
          const expectedFederatorBalance = await utils.getEtherBalance(federation);

          assert(
            federatorBalance.eq(expectedFederatorBalance),
            "Federator Balance should be the same as before"
          );
        });

        it("should fail because the sender doesn't have balance", async function() {
          await mintAndApprove(this.token, this.NFTBridge.address);

          const fixedFee = await utils.getEtherBalance(tokenOwner);
          let receipt = await this.NFTBridge.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await truffleAssert.fails(
            this.NFTBridge.receiveTokensTo(
              this.token.address,
              anAccount,
              defaultTokenId,
              {
                from: tokenOwner,
                value: fixedFee,
              }
            ),
            "sender doesn't have enough funds to send tx"
          );
        });

        it("should fail because the sent value is smaller than fixed fee", async function() {
          await mintAndApprove(this.token, this.NFTBridge.address);

          const fixedFee = new BN(15);
          let receipt = await this.NFTBridge.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await truffleAssert.fails(
            this.NFTBridge.receiveTokensTo(
              this.token.address,
              anAccount,
              defaultTokenId,
              {
                from: tokenOwner,
                value: fixedFee.sub(bigNumberOne),
              }
            ),
            "NFTBridge: value is smaller than fixed fee"
          );
        });
      });
    });

    describe("createSideNFTToken", async function() {
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

      it("creates token correctly and emits expected event when inputs are correct", async function() {
        let receipt = await this.NFTBridge.createSideNFTToken(
            tokenAddress, symbol, name, baseURI, contractURI, {from: bridgeManager}
        );

        utils.checkRcpt(receipt);
        let newSideNFTTokenAddress;
        truffleAssert.eventEmitted(
          receipt,
          newSideNFTTokenEventType,
          (event) => {
            newSideNFTTokenAddress = event._newSideNFTTokenAddress;
            return (
              event._originalTokenAddress === tokenAddress &&
              event._newSymbol === `${sideTokenSymbolPrefix}${tokenSymbol}`
            );
          }
        );
        let newSideNFTToken = await NFTERC721TestToken.at(
          newSideNFTTokenAddress
        );
        const newSideNFTTokenBaseURI = await newSideNFTToken.baseURI();
        assert.equal(baseURI, newSideNFTTokenBaseURI);

        let sideTokenAddressMappedByBridge = await this.NFTBridge.sideTokenAddressByOriginalTokenAddress(
          tokenAddress
        );
        assert.equal(newSideNFTTokenAddress, sideTokenAddressMappedByBridge);

        let tokenAddressMappedByBridge = await this.NFTBridge.originalTokenAddressBySideTokenAddress(
          newSideNFTTokenAddress
        );
        assert.equal(tokenAddress, tokenAddressMappedByBridge);
      });

      it("fails to create side NFT token if the original token address is a null address", async function() {
        await truffleAssert.fails(
            this.NFTBridge.createSideNFTToken(
                utils.NULL_ADDRESS, symbol, name, baseURI, contractURI, {from: bridgeManager}
            ),
            truffleAssert.ErrorType.REVERT,
            "Bridge: Null original token address"
        );
      });

      it("fails to create side NFT token if side token address already exists", async function() {
        let receipt = await this.NFTBridge.createSideNFTToken(
          tokenAddress, symbol, name, baseURI, contractURI, {from: bridgeManager}
        );

        truffleAssert.eventEmitted(receipt, newSideNFTTokenEventType);

        await truffleAssert.fails(
          this.NFTBridge.createSideNFTToken(
            tokenAddress, symbol, name, baseURI, contractURI, {from: bridgeManager}
          ),
          truffleAssert.ErrorType.REVERT,
          "Bridge: Side token already exists"
        );
      });

      it("fails to create side NFT token if transaction sender is not bridge manager", async function() {
        await truffleAssert.fails(
          this.NFTBridge.createSideNFTToken(
            tokenAddress, symbol, name, baseURI, contractURI, {from: anAccount}
          ),
          truffleAssert.ErrorType.REVERT,
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("acceptTransfer", async function() {
      let symbol;
      let name;
      let baseURI;
      let contractURI;
      let tokenAddress;
      const tokenId = 1;
      const blockHash = utils.getRandomHash();
      const transactionHash = utils.getRandomHash();
      const logIndex = 1;

      beforeEach(async function () {
        symbol = await this.token.symbol();
        name = await this.token.name();
        baseURI = await this.token.baseURI();
        contractURI = await this.token.contractURI();
        tokenAddress = this.token.address;
        let receipt = await this.NFTBridge.createSideNFTToken(
            tokenAddress, symbol, name, baseURI, contractURI, {from: bridgeManager}
        );
        utils.checkRcpt(receipt);
      });

      it("accepts transfer and emits event correctly", async function () {
        await assertAcceptTransferSuccessfulResult.call(this, tokenAddress, tokenId, blockHash, transactionHash, logIndex);
      });

      async function assertAcceptTransferSuccessfulResult(tokenAddress, tokenId, blockHash, transactionHash, logIndex) {
        const receipt = await this.NFTBridge.acceptTransfer(
            tokenAddress, anAccount, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
            {from: federation}
        );
        utils.checkRcpt(receipt);

        const expectedTransactionDataHash = await this.NFTBridge.getTransactionDataHash(
            anotherAccount, anAccount, tokenId, tokenAddress, blockHash, transactionHash, logIndex
        );

        let transactionDataHash = await this.NFTBridge.transactionDataHashes(transactionHash);
        assert.equal(expectedTransactionDataHash, transactionDataHash);
        assertAcceptedTransferEventOccurrence(receipt, transactionHash, tokenAddress, tokenId, blockHash, logIndex);
      }

      function assertAcceptedTransferEventOccurrence(receipt, transactionHash, tokenAddress, tokenId, blockHash, logIndex) {
        truffleAssert.eventEmitted(receipt, acceptedNFTCrossTransferEventType,
            (event) => {
              return event._transactionHash === transactionHash &&
                  event._originalTokenAddress === tokenAddress &&
                  event._to === anotherAccount &&
                  event._from === anAccount &&
                  event._tokenId.toString() === new BN(tokenId).toString() &&
                  event._blockHash === blockHash &&
                  event._logIndex.toString() === new BN(logIndex).toString();
            }
        );
      }

      it("throws an error when an address other than the federation sends the transaction", async function () {
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, anAccount, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
                {from: anAccount}
            ),
            "NFTBridge: Not Federation"
        );
      });

      it("throws an error when token is unknown", async function () {
        const unknownTokenAddress = utils.getRandomAddress();
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                unknownTokenAddress, anAccount, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
                {from: federation}
            ),
            "NFTBridge: Unknown token"
        );
      });

      it("throws an error when 'to' address is null", async function () {
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, anAccount, utils.NULL_ADDRESS, tokenId, blockHash, transactionHash, logIndex,
                {from: federation}
            ),
            "NFTBridge: Null To"
        );
      });

      it("throws an error when 'from' address is null", async function () {
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, utils.NULL_ADDRESS, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
                {from: federation}
            ),
            "NFTBridge: Null From"
        );
      });

      it("throws an error when block hash is null", async function () {
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, anAccount, anotherAccount, tokenId, utils.NULL_HASH, transactionHash, logIndex,
                {from: federation}
            ),
            "NFTBridge: Null BlockHash"
        );
      });

      it("throws an error when transaction hash is null", async function () {
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, anAccount, anotherAccount, tokenId, blockHash, utils.NULL_HASH, logIndex,
                {from: federation}
            ),
            "NFTBridge: Null TxHash"
        );
      });

      it("throws an error when transaction was already accepted", async function () {
        await assertAcceptTransferSuccessfulResult.call(this, tokenAddress, tokenId, blockHash, transactionHash, logIndex);
        await truffleAssert.fails(
            this.NFTBridge.acceptTransfer(
                tokenAddress, anAccount, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
                {from: federation}
            ),
            "NFTBridge: Already accepted"
        );
      });
    });

    describe("claim", async function () {
      let tokenAddress;
      let symbol;
      let name;
      let baseURI;
      let contractURI;
      const tokenId = 1;
      const blockHash = utils.getRandomHash();
      const transactionHash = utils.getRandomHash();
      const logIndex = 1;
      let sideTokenAddress;

      beforeEach(async function () {
        symbol = await this.token.symbol();
        name = await this.token.name();
        baseURI = await this.token.baseURI();
        contractURI = await this.token.contractURI();
        tokenAddress = this.token.address;

        // Side NFT token contract is created.
        let receipt = await this.sideNFTBridge.createSideNFTToken(
            tokenAddress, symbol, name, baseURI, contractURI, {from: bridgeManager}
        );
        utils.checkRcpt(receipt);
        truffleAssert.eventEmitted(
            receipt,
            newSideNFTTokenEventType,
            (event) => {
              sideTokenAddress = event._newSideNFTTokenAddress;
              return (
                  event._originalTokenAddress === tokenAddress &&
                  event._newSymbol === `${sideTokenSymbolPrefix}${tokenSymbol}`
              );
            }
        );

        // Mint token for anAccount (owner of the token).
        receipt = await this.token.safeMint(anAccount, tokenId, {from: tokenOwner});
        utils.checkRcpt(receipt);

        // Allow bridge to move it around.
        receipt = await this.token.approve(this.NFTBridge.address, tokenId, {from: anAccount});
        utils.checkRcpt(receipt);

        // Lock token into bridge.
        receipt = await this.NFTBridge.receiveTokensTo(
            this.token.address, anotherAccount, tokenId, {from: anAccount}
        );
        utils.checkRcpt(receipt);

        // Simulate Federator calling Bridge to accept the transfer.
        receipt = await this.sideNFTBridge.acceptTransfer(
            tokenAddress, anAccount, anotherAccount, tokenId, blockHash, transactionHash, logIndex,
            {from: federation}
        );
        utils.checkRcpt(receipt);
        truffleAssert.eventEmitted(receipt, acceptedNFTCrossTransferEventType);
      });

      it("emits expected event and modifies affected balances correctly in successful case - throws error if re-claim is attempted",
          async function () {
            await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
            await claimTokenFromBridgeEnsuringEventEmission(this.sideNFTBridge, anotherAccount, anAccount, tokenId,
                tokenAddress, blockHash, transactionHash, logIndex);
            let sideToken = await IERC721.at(sideTokenAddress);
            await assertTokenHasBeenClaimed(this.sideNFTBridge.address, anotherAccount, sideToken);

            await truffleAssert.fails(
                this.sideNFTBridge.claim(
                    {
                      to: anotherAccount, from: anAccount, tokenId: tokenId, tokenAddress: tokenAddress,
                      blockHash: blockHash, transactionHash: transactionHash, logIndex: logIndex
                    },
                    {from: anotherAccount}
                ),
                "Bridge: Already claimed"
            );

            // Original token is still locked in main chain bridge, it was claimed (minted) in side chain.
            await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
            await assertTokenHasBeenClaimed(this.sideNFTBridge.address, anotherAccount, sideToken)
          });

      it("should claim with the fallback function", async function () {
        await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
        const receipt = await this.sideNFTBridge.claimFallback(
          {
            to: anotherAccount, from: anAccount, tokenId: tokenId, tokenAddress: tokenAddress,
            blockHash: blockHash, transactionHash: transactionHash, logIndex: logIndex
          },
          {from: anAccount}
        );

        truffleAssert.eventEmitted(receipt, claimedNFTTokenEventType, (event) => {
          return (
            event._transactionHash === transactionHash &&
            event._originalTokenAddress === tokenAddress &&
            event._to === anotherAccount &&
            event._sender === anAccount &&
            event._tokenId.eq(new BN(tokenId)) &&
            event._blockHash === blockHash &&
            event._logIndex.eq(new BN(logIndex)) &&
            event._receiver === anAccount
          );
        });
      });

      it("should check if it was claimed without claiming", async function () {
        const transactionDataHash = await this.NFTBridge.getTransactionDataHash(anotherAccount, anAccount, tokenId, tokenAddress, blockHash, transactionHash, logIndex);
        const result = await this.NFTBridge.hasBeenClaimed(transactionDataHash);
        assert(!result, "The token should not been claimed yet");
      });

      it("should check if it was claimed successfully", async function () {
        await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
        await claimTokenFromBridgeEnsuringEventEmission(this.sideNFTBridge, anotherAccount, anAccount, tokenId,
            tokenAddress, blockHash, transactionHash, logIndex);
        const result = await this.sideNFTBridge.hasBeenClaimed(transactionHash);
        assert(result, "The token should have been claimed");
      });

      it("should check if it has crossed", async function () {
        await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
        await claimTokenFromBridgeEnsuringEventEmission(this.sideNFTBridge, anotherAccount, anAccount, tokenId,
            tokenAddress, blockHash, transactionHash, logIndex);
        const result = await this.sideNFTBridge.hasCrossed(transactionHash);
        assert(result, "The token should have been crossed");
      });

      async function assertTokenIsLockedInBridge(bridgeAddress, receiverAddress, token) {
        let bridgeBalance = await token.balanceOf(bridgeAddress);
        assert(
            bigNumberOne.eq(bridgeBalance), "Bridge should still have the token locked"
        )
        let anotherAccountBalance = await token.balanceOf(receiverAddress);
        assert(
            bigNumberZero.eq(anotherAccountBalance), "Receiver account should still not have the token"
        )
      }

      async function claimTokenFromBridgeEnsuringEventEmission(bridge, to, from, tokenId, tokenAddress, blockHash,
                                                                transactionHash, logIndex) {
        const receipt = await bridge.claim(
            {
              to: to, from: from, tokenId: tokenId, tokenAddress: tokenAddress,
              blockHash: blockHash, transactionHash: transactionHash, logIndex: logIndex
            },
            {from: to}
        );

        truffleAssert.eventEmitted(receipt, claimedNFTTokenEventType, (event) => {
          return (
              event._transactionHash === transactionHash &&
              event._originalTokenAddress === tokenAddress &&
              event._to === to &&
              event._sender === from &&
              event._tokenId.eq(new BN(tokenId)) &&
              event._blockHash === blockHash &&
              event._logIndex.eq(new BN(logIndex)) &&
              event._receiver === to
          );
        });


      }

      async function assertTokenHasBeenClaimed(bridgeAddress, receiverAddress, token) {
        let bridgeBalance = await token.balanceOf(bridgeAddress);
        assert(
            bigNumberZero.eq(bridgeBalance), "Bridge should not have the token locked anymore"
        )
        let anotherAccountBalance = await token.balanceOf(receiverAddress);
        assert(
            bigNumberOne.eq(anotherAccountBalance), "Receiver account should have the token"
        )
      }

      it("throws an error when claim data doesn't match acceptTransfer transaction hash data", async function () {
        await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);

        const unexpectedTokenId = tokenId + 1;
        await truffleAssert.fails(
            this.sideNFTBridge.claim(
                {
                  to: anotherAccount, from: anAccount, tokenId: unexpectedTokenId, tokenAddress: tokenAddress,
                  blockHash: blockHash, transactionHash: transactionHash, logIndex: logIndex
                },
                {from: anotherAccount}
            ),
            "Bridge: Wrong txDataHash"
        );

        await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
      });

      it("crosses an NFT back and forth emitting the expected events and leaving correct balances",
          async function () {
            // Side token is correctly claimed from side chain.
            await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);
            await claimTokenFromBridgeEnsuringEventEmission(this.sideNFTBridge, anotherAccount, anAccount, tokenId,
                tokenAddress, blockHash, transactionHash, logIndex);
            let sideToken = await IERC721.at(sideTokenAddress);
            await assertTokenHasBeenClaimed(this.sideNFTBridge.address, anotherAccount, sideToken);

            // Cross back is started.
            // Side chain bridge is allowed to move side token around.
            let receipt = await sideToken.approve(this.sideNFTBridge.address, tokenId, {from: anotherAccount});
            utils.checkRcpt(receipt);

            // Side token is burned.
            receipt = await this.sideNFTBridge.receiveTokensTo(
                sideToken.address, anAccount, tokenId, {from: anotherAccount}
            );
            const expectedTotalSupplyAfterBurn = 0;
            utils.checkRcpt(receipt);
            truffleAssert.eventEmitted(receipt, crossEventType, (event) => {
              return event._originalTokenAddress === this.token.address &&
                  event._from === anotherAccount &&
                  event._to === anAccount &&
                  event._totalSupply.eq(new BN(expectedTotalSupplyAfterBurn)) &&
                  event._tokenId.eq(new BN(tokenId))
            });
            await truffleAssert.fails(
                sideToken.ownerOf(tokenId),
                "ERC721: owner query for nonexistent token"
            );

            // Simulate Federator calling Bridge on main chain to accept the transfer.
            const crossBackBlockHash = utils.getRandomHash();
            const crossBackTransactionHash = utils.getRandomHash();
            receipt = await this.NFTBridge.acceptTransfer(
                tokenAddress, anotherAccount, anAccount, tokenId, crossBackBlockHash, crossBackTransactionHash,
                logIndex, {from: federation}
            );
            utils.checkRcpt(receipt);
            truffleAssert.eventEmitted(receipt, acceptedNFTCrossTransferEventType);
            await assertTokenIsLockedInBridge(this.NFTBridge.address, anotherAccount, this.token);

            // Original token is correctly claimed from main chain.
            await claimTokenFromBridgeEnsuringEventEmission(this.NFTBridge, anAccount, anotherAccount, tokenId, tokenAddress,
                crossBackBlockHash, crossBackTransactionHash, logIndex);
            await assertTokenHasBeenClaimed(this.NFTBridge.address, anAccount, this.token);
          });

    });
  });
});
