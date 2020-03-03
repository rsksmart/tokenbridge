const SideToken = artifacts.require('./SideToken_v1');
const SideTokenFactory = artifacts.require('./SideTokenFactory_v1');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('SideTokenFactory_v1', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];

    beforeEach(async function () {
        this.sideToken = await SideToken.new();
        this.sideTokenFactory = await SideTokenFactory.new(this.sideToken.address);
    });

    it('creates a new side token with correct parameters', async function () {
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SIDE", 1);
        utils.checkRcpt(receipt);

        receipt = await this.sideTokenFactory.createSideToken("OTHERSYMBOL", "OTHERSYMBOL", 1);
        utils.checkRcpt(receipt);
    });

    it('fails to create a new side token due to wrong parameters', async function() {
        await utils.expectThrow(this.sideTokenFactory.createSideToken());
        await utils.expectThrow(this.sideTokenFactory.createSideToken("SIDE", 1));
    });

    it('fails to create a new side token due to wrong caller', async function() {
        assert.equal(await this.sideTokenFactory.primary(), tokenCreator);
        await utils.expectThrow(this.sideTokenFactory.createSideToken("SIDE", "SIDE", 1, { from: anAccount }));
    });

    it('fails to create a new side token due to template is not initialized', async function() {
        await utils.expectThrow(SideTokenFactory.new(utils.NULL_ADDRESS));
    });

    it('fails to set a new side token template if empty', async function() {
        await utils.expectThrow(this.sideTokenFactory.setTemplateAddress('0x'));
    });

    it('should create side token', async function () {
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SID", 1);
        utils.checkRcpt(receipt);
        assert.equal(receipt.logs[0].event, 'createdSideToken');
        let sideTokenAddress = receipt.logs[0].args[0];
        assert.isTrue(sideTokenAddress != 0);
        assert.equal(receipt.logs[0].args[1], "SID");

        let sideToken = await SideToken.at(sideTokenAddress);

        const tokenBalance = await sideToken.balanceOf(tokenCreator);
        assert.equal(tokenBalance, 0);

        const totalSupply = await sideToken.totalSupply();
        assert.equal(totalSupply, 0);

        const symbol = await sideToken.symbol();
        assert.equal(symbol, "SID");

        const name = await sideToken.name();
        assert.equal(name, "SIDE");

        let minter = await sideToken.minter();
        assert.equal(minter, tokenCreator);

        receipt = await this.sideTokenFactory.createSideToken("OTHERSYMBOL", "OTHERSYMBOL", 1, { from: tokenCreator});
        utils.checkRcpt(receipt);
        assert.equal(receipt.logs[0].event, 'createdSideToken');
        let newSideTokenAddress = receipt.logs[0].args[0];
        assert.isTrue(newSideTokenAddress != 0);
        assert.isTrue(newSideTokenAddress != sideTokenAddress);
        assert.equal(receipt.logs[0].args[1], "OTHERSYMBOL");
    });

    it('should create mintable tokens with caller', async function () {
        await this.sideTokenFactory.transferPrimary(anAccount);
        assert.equal(await this.sideTokenFactory.primary(), anAccount);

        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SID", 1, { from: anAccount });

        let sideTokenAddress = receipt.logs[0].args[0];
        let sideToken = await SideToken.at(sideTokenAddress);

        const minter = await sideToken.minter();
        assert.equal(minter, anAccount);
    });

    it('should change the Side Token Template', async function() {
        let address = await this.sideTokenFactory.sideTokenTemplate();
        assert.equal(address.toLowerCase(), this.sideToken.address.toLowerCase());
        let newAddress = randomHex(20);
        await this.sideTokenFactory.setTemplateAddress(newAddress);
        address = await this.sideTokenFactory.sideTokenTemplate();
        assert.equal(address.toLowerCase(), newAddress.toLowerCase());
        
    });
});
