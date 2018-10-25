const SideToken = artifacts.require('./SideToken');

contract('SideToken', function (accounts) {
    const tokenManager = accounts[1];
    
    beforeEach(async function () {
        this.token = await SideToken.new("MAIN", "MAIN", 18, tokenManager);
    });

    it('initial state', async function () {
        const balance = await this.token.balanceOf(accounts[0]);
        assert.equal(balance, 0);

        const tokenBalance = await this.token.balanceOf(this.token.address);
        assert.equal(tokenBalance, 0);

        const managerBalance = await this.token.balanceOf(tokenManager);
        assert.equal(managerBalance, 0);
        
        const totalSupply = await this.token.totalSupply();        
        assert.equal(totalSupply, 0);
    });
});

