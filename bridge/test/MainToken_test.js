const MainToken = artifacts.require('./MainToken');

contract('MainToken', function (accounts) {
    describe('creation', function () {
        it('create MainToken', async function () {
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000);
            
            const balance = await this.token.balanceOf(accounts[0]);
            
            assert.equal(balance, 10000);
            
            const totalSupply = await this.token.totalSupply();
            
            assert.equal(totalSupply, 10000);
        });
    });
});
