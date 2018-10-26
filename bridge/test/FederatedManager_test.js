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

    it('one vote for transaction', async function() {
        await this.manager.voteTransaction(1, 2, 3, 4, 5);
        
        const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

        assert.ok(votes);
        assert.ok(Array.isArray(votes));
        assert.equal(votes.length, 1);
        assert.equal(votes[0], accounts[0]);
    });

    it('two votes for transaction', async function() {
        await this.manager.voteTransaction(1, 2, 3, 4, 5);
        await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: accounts[1] });
        
        const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

        assert.ok(votes);
        assert.ok(Array.isArray(votes));
        assert.equal(votes.length, 2);
        assert.equal(votes[0], accounts[0]);
        assert.equal(votes[1], accounts[1]);
    });
});
