const SideNFTToken = artifacts.require('./SideNFTToken');
const SideNFTTokenFactory = artifacts.require('./SideNFTTokenFactory');

const utils = require('./utils');
const truffleAssert = require('truffle-assertions');

contract('SideNFTTokenFactory', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];
    const tokenName = "The Drops";
    const tokenSymbol = "drop";
    const tokenBaseURI = "ipfs:/";
    const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";
    const sideNFTTokenCreatedEventType = 'SideNFTTokenCreated';
    const alternateTokenName = "The Peters";
    const alternateTokenSymbol = "peter";
    const alternateTokenBaseURI = "peter:/";
    const alternateTokenContractURI = "https://api-mainnet.rarible.com/alternateContractMetadata"

    beforeEach(async function () {
        this.sideNFTTokenFactory = await SideNFTTokenFactory.new();
    });

    it('should create two correct side NFT tokens upon correct parameters', async function () {
        let receipt = await this.sideNFTTokenFactory.createSideNFTToken(tokenName, tokenSymbol, tokenBaseURI, tokenContractURI);
        utils.checkRcpt(receipt);
        let firstSideTokenAddress;
        truffleAssert.eventEmitted(receipt, sideNFTTokenCreatedEventType, (event) => {
            firstSideTokenAddress = event.sideTokenAddress;
            return firstSideTokenAddress !== 0 &&
                event.symbol === tokenSymbol &&
                event.baseURI === tokenBaseURI &&
                event.contractURI === tokenContractURI;
        });
        const sideToken = await SideNFTToken.at(firstSideTokenAddress);
        const tokenBalance = await sideToken.balanceOf(tokenCreator);
        assert.equal(tokenBalance, 0);
        const totalSupply = await sideToken.totalSupply();
        assert.equal(totalSupply, 0);
        const symbol = await sideToken.symbol();
        assert.equal(symbol, tokenSymbol);
        const name = await sideToken.name();
        assert.equal(name, tokenName);
        const minter = await sideToken.minter();
        assert.equal(minter, tokenCreator);

        receipt = await this.sideNFTTokenFactory.createSideNFTToken(alternateTokenName, alternateTokenSymbol,
            alternateTokenBaseURI, alternateTokenContractURI, {from: tokenCreator});
        utils.checkRcpt(receipt);
        truffleAssert.eventEmitted(receipt, sideNFTTokenCreatedEventType, (event) => {
            const secondSideTokenAddress = event.sideTokenAddress;
            return secondSideTokenAddress !== 0 &&
                secondSideTokenAddress !== firstSideTokenAddress &&
                event.symbol === alternateTokenSymbol &&
                event.baseURI === alternateTokenBaseURI &&
                event.contractURI === alternateTokenContractURI;
        });
    });

    it('fails to create a new side NFT token due to using a wrong caller', async function () {
        const expectedErrorReason = "Secondary: caller is not the primary account"
        assert.equal(await this.sideNFTTokenFactory.primary(), tokenCreator);

        let error = await utils.expectThrow(this.sideNFTTokenFactory.createSideNFTToken(tokenName, tokenName,
            tokenBaseURI, tokenContractURI, {from: anAccount}));

        assert.equal(expectedErrorReason, error.reason)
    });

    it('should create mintable NFT tokens with caller', async function () {
        await this.sideNFTTokenFactory.transferPrimary(anAccount);
        assert.equal(await this.sideNFTTokenFactory.primary(), anAccount);

        let receipt = await this.sideNFTTokenFactory.createSideNFTToken(tokenName, tokenSymbol,
            tokenBaseURI, tokenContractURI, {from: anAccount});
        let sideTokenAddress = receipt.logs[0].args[0];
        let sideToken = await SideNFTToken.at(sideTokenAddress);

        const minter = await sideToken.minter();
        assert.equal(minter, anAccount);
    });

});
