const SideToken = artifacts.require('./SideToken');
const SideTokenFactory = artifacts.require('./SideTokenFactory');

const utils = require('./utils');

contract('SideTokenFactory', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];

    beforeEach(async function () {
        this.sideTokenFactory = await SideTokenFactory.new();
    });

    it('creates a new side token with correct parameters', async function () {
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SIDE");
        utils.checkRcpt(receipt);

        receipt = await this.sideTokenFactory.createSideToken("OTHERSYMBOL", "OTHERSYMBOL");
        utils.checkRcpt(receipt);
    });

    it('fails to create a new side token due to wrong parameters', async function() {
        await utils.expectThrow(this.sideTokenFactory.createSideToken());
        await utils.expectThrow(this.sideTokenFactory.createSideToken("SIDE", 1));
    });

    it('fails to create a new side token due to wrong owner', async function() {
        await utils.expectThrow(this.sideTokenFactory.createSideToken("SIDE", "SIDE", { from: anAccount }));
    });

    it('should create side token', async function () {
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SID");
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

        let defaultOperators = await sideToken.defaultOperators();
        assert.equal(defaultOperators[0], tokenCreator);

        receipt = await this.sideTokenFactory.createSideToken("OTHERSYMBOL", "OTHERSYMBOL");
        utils.checkRcpt(receipt);
        assert.equal(receipt.logs[0].event, 'createdSideToken');
        let newSideTokenAddress = receipt.logs[0].args[0];
        assert.isTrue(newSideTokenAddress != 0);
        assert.isTrue(newSideTokenAddress != sideTokenAddress);
        assert.equal(receipt.logs[0].args[1], "OTHERSYMBOL");
        defaultOperators = await sideToken.defaultOperators();
        assert.equal(defaultOperators[0], tokenCreator);
    });

    it('should create create mintable tokens with owner', async function () {
        await this.sideTokenFactory.transferOwnership(anAccount);
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SID", { from: anAccount });

        let sideTokenAddress = receipt.logs[0].args[0];
        let sideToken = await SideToken.at(sideTokenAddress);

        const isDefaultOperator = await sideToken.isDefaultOperator(anAccount);
        assert.equal(isDefaultOperator, true);
    });

});
