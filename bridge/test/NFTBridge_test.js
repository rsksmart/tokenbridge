const MainTokenNFTerc721 = artifacts.require("./MainTokenNFTerc721");
const NftErc721 = artifacts.require("./ERC721");
// const AlternativeERC20Detailed = artifacts.require('./AlternativeERC20Detailed');
// const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require("./Bridge");
const NftBridge = artifacts.require("./NFTBridge");
const AllowTokens = artifacts.require("./AllowTokens");
const SideTokenFactory = artifacts.require("./SideTokenFactory");
// const mockReceiveTokensCall = artifacts.require('./mockReceiveTokensCall');
// const WRBTC = artifacts.require('./WRBTC');

const utils = require("./utils");
const truffleAssert = require("truffle-assertions");
const ethUtil = require("ethereumjs-util");

const BN = web3.utils.BN;
const randomHex = web3.utils.randomHex;
const ONE_DAY = 24 * 3600;
const toWei = web3.utils.toWei;

const keccak256 = web3.utils.keccak256;

contract("Bridge NFT", async function(accounts) {
  const bridgeOwner = accounts[0];
  const tokenOwner = accounts[1];
  const bridgeManager = accounts[2];
  const anAccount = accounts[3];
  const newBridgeManager = accounts[4];
  const federation = accounts[5];
  const tokenName = "The Drops";
  const tokenSymbol = "drop";

  before(async function() {
    await utils.saveState();
  });

  after(async function() {
    await utils.revertState();
  });

  beforeEach(async function() {
    // this.token = await MainToken.new(tokenName, tokenSymbol, 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
    this.nft = await MainTokenNFTerc721.new(tokenName, tokenSymbol, { from: tokenOwner });
    this.nft.setBaseURI(
      "ipfs://ipfs/QmYBX4nZfrHMPFUD9CJcq82Pexp8bpgtf89QBwRNtDQihS"
    );

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
    await this.allowTokens.setToken(this.nft.address, this.typeId, {
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

  describe("Main network", async function() {
    describe("receiveTokensNFT", async function() {
      it("receiveTokens NFT ERC 721", async function() {
        const tokenId = 9;

        await this.nft.safeMint(tokenOwner, tokenId);
        let receipt = await this.nft.approve(anAccount, tokenId, { from: tokenOwner });
        utils.checkRcpt(receipt);
        receipt = await this.nft.setApprovalForAll(anAccount, tokenId, { from: tokenOwner });
        utils.checkRcpt(receipt);

        // const totalSupply = 20;
        // const royaltyFee = 10;

        // receipt = await this.bridgeNft.receiveTokensTo(
        //   this.nft.address,
        //   anAccount,
        //   tokenId,
        //   { from: tokenOwner }
        // );

        // let metadataStr = '{"name":"#08 - Drops Drop","description":"The Drops Original Series \n\nBuyers will get access to the drops.family channel on discord. \n\nIncludes:\n1x Portrait shot - Animated\n1x Portratit shot - Still (Unlockable).\n1x Side view - Still (Unlockable).","animation_url":"ipfs://ipfs/QmSJqtt9RQc8xuWrKhT2i5rScsXJ676o7ZAqYK9enLHMwE/animation.mp4","image":"ipfs://ipfs/QmSJqtt9RQc8xuWrKhT2i5rScsXJ676o7ZAqYK9enLHMwE/image.gif","external_url":"https://rarible.com/token/0xa4cbac73fa850e431303245ac23a688eef1b0056:9","attributes":[{"key":"Size","trait_type":"Size","value":"2160x2160px"},{"key":"Background","trait_type":"Background","value":"Grey"},{"key":"alt_text","trait_type":"alt_text","value":"#08 - Drops Drop"}]}';

        // var metadataBuffer = [];
        // var buffer = new Buffer.from(metadataStr, 'utf16le');
        // for (var i = 0; i < buffer.length; i++) {
        //   metadataBuffer.push(buffer[i]);
        // }

        // let metadataHexa = utils.ascii_to_hexa(metadataStr);
        // utils.checkRcpt(receipt);

        // truffleAssert.eventEmitted(receipt, 'Cross', (ev) => {
        //   console.log(ev);

        //   return ev._tokenAddress === token.address
        //     && ev._from === tokenOwner
        //     && ev._to === anAccount
        //     && ev._tokenCreator === tokenOwner
        //     && ev._userData === null
        //     && ev._metadata === metadata
        //     && ev._amount === totalSupply
        //     && ev._tokenId === tokenId
        //     && ev._royaltyFees === royaltyFee
        //     && ev._tokenName === tokenName
        //     && ev._tokenSymbol === tokenSymbol
        //     && ev._tokenURI === tokenURI;
        // });

        // const tokenBalance = await this.token.balanceOf(tokenOwner);
        // assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
        // const bridgeBalance = await this.token.balanceOf(this.bridge.address);
        // assert.equal(bridgeBalance.toString(), amount.toString());
        // const isKnownToken = await this.bridge.knownTokens(this.token.address);
        // assert.equal(isKnownToken, true);
      });
    });
  });
});
