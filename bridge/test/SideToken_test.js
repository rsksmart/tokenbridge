const SideToken = artifacts.require('./SideToken');

contract('SideToken', function (accounts) {
    const tokenCreator = accounts[0];
    const tokenManager = accounts[1];
    const anAccount = accounts[2];
    
    beforeEach(async function () {
        this.token = await SideToken.new("MAIN", "MAIN", 18, tokenManager);
    });

    it('initial state', async function () {
        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const managerBalance = await this.token.balanceOf(tokenManager);
        assert.equal(managerBalance, 0);
        
        const totalSupply = await this.token.totalSupply();        
        assert.equal(totalSupply, 0);
    });

    it('accept transfer', async function () {
        await this.token.acceptTransfer(anAccount, 1000);
        
        const creatorBalance = await this.token.balanceOf(tokenCreator);
        assert.equal(creatorBalance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const managerBalance = await this.token.balanceOf(tokenManager);
        assert.equal(managerBalance, 0);

        const anAccountBalance = await this.token.balanceOf(anAccount);
        assert.equal(anAccountBalance, 1000);
        
        const totalSupply = await this.token.totalSupply();        
        assert.equal(totalSupply, 1000);
    });
});

