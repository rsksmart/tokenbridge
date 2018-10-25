const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

contract('Bridge', function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    
    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
        this.bridge = await Bridge.new(bridgeManager, this.token.address, { from: bridgeOwner });
    });

    it('accept transfer', async function () {
        await this.token.transfer(this.bridge.address, 1000, { from: tokenOwner });
        
        const tokenBalance = await this.token.balanceOf(tokenOwner);
        assert.equal(tokenBalance, 9000);
        
        const bridgeBalance = await this.token.balanceOf(this.bridge.address);
        assert.equal(bridgeBalance, 1000);
    });
});

    