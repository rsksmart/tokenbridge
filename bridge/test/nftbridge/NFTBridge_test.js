const NFTERC721TestToken = artifacts.require("./NFTERC721TestToken");
const NftBridge = artifacts.require("./NFTBridge");
const AllowTokens = artifacts.require("./AllowTokens");
const SideNFTTokenFactory = artifacts.require("./SideNFTTokenFactory");

const utils = require("../utils");
const truffleAssert = require("truffle-assertions");
const randomHex = web3.utils.randomHex;
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const ADDRESS_LENGTH = 20;

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
  
  function executeSideNFTTokenCreationTransaction(
      tokenAddress,
      symbol,
      name,
      baseURI,
      contractURI,
      bridgeManager
  ) {
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

  describe("Main NFT network", async function() {
    it("should retrieve the version", async function() {
      const result = await this.bridgeNft.version();
      assert.equal(result, "v1");
    });

    describe("owner", async function() {
      it("check manager", async function() {
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, bridgeManager);
      });

      it("change manager", async function() {
        const receipt = await this.bridgeNft.transferOwnership(
          newBridgeManager,
          { from: bridgeManager }
        );
        utils.checkRcpt(receipt);
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, newBridgeManager);
      });

      it("only manager can change manager", async function() {
        await truffleAssert.fails(
          this.bridgeNft.transferOwnership(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          "Ownable: caller is not the owner"
        );
        const manager = await this.bridgeNft.owner();
        assert.equal(manager, bridgeManager);
      });

      it("check federation", async function() {
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });

      it("change federation", async function() {
        const receipt = await this.bridgeNft.changeFederation(
          newBridgeManager,
          { from: bridgeManager }
        );
        utils.checkRcpt(receipt);
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, newBridgeManager);
      });

      it("only manager can change the federation", async function() {
        await truffleAssert.fails(
          this.bridgeNft.changeFederation(newBridgeManager),
          truffleAssert.ErrorType.REVERT,
          "Ownable: caller is not the owner"
        );
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });

      it("change federation new fed cant be null", async function() {
        await truffleAssert.fails(
          this.bridgeNft.changeFederation(utils.NULL_ADDRESS, {
            from: bridgeManager,
          }),
          truffleAssert.ErrorType.REVERT,
          "Bridge: Federation is empty"
        );
        const federationAddress = await this.bridgeNft.getFederation();
        assert.equal(federationAddress, federation);
      });
    });

    describe("receiveTokensTo", async function() {
      it("receives ERC721 NFT correctly with token URI", async function() {
        let totalSupply = 0; // is the amount of nft minted

        await mintAndApprove(this.token, this.bridgeNft.address);
        totalSupply++;

        let receipt = await this.token.setTokenURI(defaultTokenId, defaultTokenURI);
        utils.checkRcpt(receipt);

        receipt = await this.bridgeNft.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          // console.log(ev);

          return (
            ev._tokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._amount == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == tokenBaseURI + defaultTokenURI
          );
        });
      });

      it("receives ERC721 NFT correctly with base URI and without token URI set", async function() {
        let totalSupply = 0;

        await mintAndApprove(this.token, this.bridgeNft.address);
        totalSupply++;

        let receipt = await this.bridgeNft.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._tokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._amount == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == tokenBaseURI + defaultTokenId
          );
        });
      });

      it("receives ERC721 NFT correctly without token and base URI set", async function() {
        let totalSupply = 0;

        await this.token.setBaseURI('');
        await mintAndApprove(this.token, this.bridgeNft.address);
        totalSupply++;

        let receipt = await this.bridgeNft.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._tokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._amount == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == ''
          );
        });
      });

      it("receives ERC721 NFT correctly with token URI and without base URI", async function() {
        let totalSupply = 0;

        await this.token.setBaseURI('');
        await mintAndApprove(this.token, this.bridgeNft.address);
        totalSupply++;

        let receipt = await this.token.setTokenURI(defaultTokenId, defaultTokenURI);
        utils.checkRcpt(receipt);

        receipt = await this.bridgeNft.receiveTokensTo(
          this.token.address,
          anAccount,
          defaultTokenId,
          { from: tokenOwner }
        );
        utils.checkRcpt(receipt);

        truffleAssert.eventEmitted(receipt, "Cross", (ev) => {
          return (
            ev._tokenAddress == this.token.address &&
            ev._from == tokenOwner &&
            ev._to == anAccount &&
            ev._tokenCreator == tokenOwner &&
            ev._userData == null &&
            ev._amount == totalSupply &&
            ev._tokenId == defaultTokenId &&
            ev._tokenURI == defaultTokenURI
          );
        });
      });

      describe("fixed fee", async function() {
        it("should send fee to federator correctly", async function() {
          const fixedFee = new BN("15");
          let receipt = await this.bridgeNft.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await mintAndApprove(this.token, this.bridgeNft.address);

          const tokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.bridgeNft.receiveTokensTo(
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
          let receipt = await this.bridgeNft.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await mintAndApprove(this.token, this.bridgeNft.address);

          const tokenOwnerBalance = await utils.getEtherBalance(tokenOwner);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.bridgeNft.receiveTokensTo(
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
          let receipt = await this.bridgeNft.setFixedFee(new BN(0), {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await mintAndApprove(this.token, this.bridgeNft.address);
          const federatorBalance = await utils.getEtherBalance(federation);

          const tx = await this.bridgeNft.receiveTokensTo(
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
          await mintAndApprove(this.token, this.bridgeNft.address);

          const fixedFee = await utils.getEtherBalance(tokenOwner);
          let receipt = await this.bridgeNft.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await truffleAssert.fails(
            this.bridgeNft.receiveTokensTo(
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
          await mintAndApprove(this.token, this.bridgeNft.address);

          const fixedFee = new BN(15);
          let receipt = await this.bridgeNft.setFixedFee(fixedFee, {
            from: bridgeManager,
          });
          utils.checkRcpt(receipt);

          await truffleAssert.fails(
            this.bridgeNft.receiveTokensTo(
              this.token.address,
              anAccount,
              defaultTokenId,
              {
                from: tokenOwner,
                value: fixedFee.sub(new BN(1)),
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
        let receipt = await executeSideNFTTokenCreationTransaction.call(
          this,
          tokenAddress,
          symbol,
          name,
          baseURI,
          contractURI,
          bridgeManager
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

        let sideTokenAddressMappedByBridge = await this.bridgeNft.sideTokenAddressByOriginalTokenAddress(
          tokenAddress
        );
        assert.equal(newSideNFTTokenAddress, sideTokenAddressMappedByBridge);

        let tokenAddressMappedByBridge = await this.bridgeNft.originalTokenAddressBySideTokenAddress(
          newSideNFTTokenAddress
        );
        assert.equal(tokenAddress, tokenAddressMappedByBridge);
      });

      it("fails to create side NFT token if the original token address is a null address", async function() {
        await truffleAssert.fails(
          executeSideNFTTokenCreationTransaction.call(
            this,
            utils.NULL_ADDRESS,
            symbol,
            name,
            baseURI,
            contractURI,
            bridgeManager
          ),
          truffleAssert.ErrorType.REVERT,
          "Bridge: Null original token address"
        );
      });

      it("fails to create side NFT token if side token address already exists", async function() {
        let receipt = await executeSideNFTTokenCreationTransaction.call(
          this,
          tokenAddress,
          symbol,
          name,
          baseURI,
          contractURI,
          bridgeManager
        );

        truffleAssert.eventEmitted(receipt, newSideNFTTokenEventType);

        await truffleAssert.fails(
          executeSideNFTTokenCreationTransaction.call(
            this,
            tokenAddress,
            symbol,
            name,
            baseURI,
            contractURI,
            bridgeManager
          ),
          truffleAssert.ErrorType.REVERT,
          "Bridge: Side token already exists"
        );
      });

      it("fails to create side NFT token if transaction sender is not bridge manager", async function() {
        await truffleAssert.fails(
          executeSideNFTTokenCreationTransaction.call(
            this,
            tokenAddress,
            symbol,
            name,
            baseURI,
            contractURI,
            anAccount
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
      const blockHash = randomHex(32);
      const transactionHash = randomHex(32);
      const logIndex = 1;

      beforeEach(async function () {
        symbol = await this.token.symbol();
        name = await this.token.name();
        baseURI = await this.token.baseURI();
        contractURI = await this.token.contractURI();
        tokenAddress = this.token.address;
        let receipt = await executeSideNFTTokenCreationTransaction.call(
            this,
            tokenAddress,
            symbol,
            name,
            baseURI,
            contractURI,
            bridgeManager
        );
        utils.checkRcpt(receipt);
      });

      it("accepts transfer and emits event correctly", async function () {
        await assertAcceptTransferSuccessfulResult.call(this, tokenAddress, tokenId, blockHash, transactionHash, logIndex);
      });

      async function assertAcceptTransferSuccessfulResult(tokenAddress, tokenId, blockHash, transactionHash, logIndex) {
        const receipt = await this.bridgeNft.acceptTransfer(
            tokenAddress,
            anAccount,
            anotherAccount,
            tokenId,
            blockHash,
            transactionHash,
            logIndex,
            {from: federation}
        );
        utils.checkRcpt(receipt);

        const expectedTransactionDataHash = await this.bridgeNft.getTransactionDataHash(
            anotherAccount,
            tokenId,
            blockHash,
            transactionHash,
            logIndex
        );

        await assertAcceptTransferPublicMembersCorrectness.call(this, transactionHash, expectedTransactionDataHash, tokenAddress);
        assertAcceptedTransferEventOccurrence(receipt, transactionHash, tokenAddress, tokenId, blockHash, logIndex);
      }

      async function assertAcceptTransferPublicMembersCorrectness(transactionHash, expectedTransactionDataHash, tokenAddress) {
        let transactionDataHash = await this.bridgeNft.transactionDataHashes(transactionHash);
        assert.equal(expectedTransactionDataHash, transactionDataHash);

        let originalTokenAddressForTransactionHash = await this.bridgeNft.originalTokenAddresses(transactionHash);
        assert.equal(tokenAddress, originalTokenAddressForTransactionHash)

        let senderAddressForTransactionHash = await this.bridgeNft.senderAddresses(transactionHash);
        assert.equal(anAccount, senderAddressForTransactionHash);
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
            this.bridgeNft.acceptTransfer(
                tokenAddress,
                anAccount,
                anotherAccount,
                tokenId,
                blockHash,
                transactionHash,
                logIndex,
                {from: anAccount}
            ),
            "Bridge: Not Federation"
        );
      });

      it("throws an error when token is unknown", async function () {
        const unknownTokenAddress = randomHex(ADDRESS_LENGTH);
        await truffleAssert.fails(
            this.bridgeNft.acceptTransfer(
                unknownTokenAddress,
                anAccount,
                anotherAccount,
                tokenId,
                blockHash,
                transactionHash,
                logIndex,
                {from: federation}
            ),
            "Bridge: Unknown token"
        );
      });

      it("throws an error when 'to' address is null", async function () {
        await truffleAssert.fails(
            this.bridgeNft.acceptTransfer(
                tokenAddress,
                anAccount,
                utils.NULL_ADDRESS,
                tokenId,
                blockHash,
                transactionHash,
                logIndex,
                {from: federation}
            ),
            "Bridge: Null To"
        );
      });

      it("throws an error when block hash is null", async function () {
        await truffleAssert.fails(
            this.bridgeNft.acceptTransfer(
                tokenAddress,
                anAccount,
                anotherAccount,
                tokenId,
                utils.NULL_HASH,
                transactionHash,
                logIndex,
                {from: federation}
            ),
            "Bridge: Null BlockHash"
        );
      });

      it("throws an error when transaction hash is null", async function () {
        await truffleAssert.fails(
            this.bridgeNft.acceptTransfer(
                tokenAddress,
                anAccount,
                anotherAccount,
                tokenId,
                blockHash,
                utils.NULL_HASH,
                logIndex,
                {from: federation}
            ),
            "Bridge: Null TxHash"
        );
      });

      it("throws an error when transaction was already accepted", async function () {
        await assertAcceptTransferSuccessfulResult.call(this, tokenAddress, tokenId, blockHash, transactionHash, logIndex);
        await truffleAssert.fails(
            this.bridgeNft.acceptTransfer(
                tokenAddress,
                anAccount,
                anotherAccount,
                tokenId,
                blockHash,
                transactionHash,
                logIndex,
                {from: federation}
            ),
            "Bridge: Already accepted"
        );
      });
    });
  });
});
