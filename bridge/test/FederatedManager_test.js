const FederatedManager = artifacts.require('./FederatedManager');

contract('FederatedManager', function (accounts) {
    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
    
    beforeEach(async function () {
        this.manager = await FederatedManager.new(members);
    });

    it('is member', async function() {
        const notmember = await this.manager.isMember(accounts[0]);
        
        assert.equal(notmember, false);
        
        for (var k = 0; k < members.length; k++) {
            const ismember = await this.manager.isMember(members[k]);
            
            assert.ok(ismember);
        }
    });

    it('no votes for unknown transaction', async function() {
        const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

        assert.ok(votes);
        assert.ok(Array.isArray(votes));
        assert.equal(votes.length, 0);
    });
});
