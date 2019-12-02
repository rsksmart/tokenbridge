const SideToken = artifacts.require('./SideToken');
const { singletons, BN, expectEvent } = require('@openzeppelin/test-helpers');

const expectThrow = require('./utils').expectThrow;

contract('SideToken', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];
    const anotherAccount = accounts[2];

    beforeEach(async function () {
        this.token = await SideToken.new("SIDE", "SIDE", tokenCreator);
    });

    it('initial state', async function () {
        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const anAccountBalance = await this.token.balanceOf(anAccount);
        assert.equal(anAccountBalance, 0);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 0);
    });

    it('mint', async function () {
        await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });

        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const anAccountBalance = await this.token.balanceOf(anAccount);
        assert.equal(anAccountBalance, 1000);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 1000);
    });

    it('mint only default operators', async function () {
        expectThrow(this.token.mint(anAccount, 1000, '0x', '0x', { from: anAccount }));

        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const anAccountBalance = await this.token.balanceOf(anAccount);
        assert.equal(anAccountBalance, 0);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 0);
    });

    it('transfer account to account', async function () {
        await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
        await this.token.transfer(anotherAccount, 400, { from: anAccount });

        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const anAccountBalance = await this.token.balanceOf(anAccount);
        assert.equal(anAccountBalance, 600);

        const anotherAccountBalance = await this.token.balanceOf(anotherAccount);
        assert.equal(anotherAccountBalance, 400);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 1000);
    });

});

