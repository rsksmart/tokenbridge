const SideToken = artifacts.require('./SideNFTToken');

const utils = require('./utils');

contract('SideNFTToken', async function (accounts) {
    const tokenCreator = accounts[0];
    const tokenName = "The Drops";
    const tokenSymbol = "drop";
    const tokenBaseURI = "ipfs:/";

    before(async function () {
        await utils.saveState();
    });

    after(async function () {
        await utils.revertState();
    });

    describe('constructor', async function () {

        it('should create side token', async function () {
            let token = await SideToken.new(tokenName, tokenSymbol, tokenCreator, tokenBaseURI);
            assert.isNotEmpty(token.address)
        });
        it('should fail empty minter address', async function () {
            await utils.expectThrow(SideToken.new(tokenName, tokenSymbol, '0x', tokenBaseURI));
        });

    });

    // TODO: add tests associated to permit (SideToken_test.js for reference).

});

