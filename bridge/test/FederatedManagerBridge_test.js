const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');

const expectThrow = require('./utils').expectThrow;

contract('FederatedManager', function (accounts) {
    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
    const notmember = accounts[0];
    const newmanager = accounts[8];
    const newmanager2 = accounts[9];

    describe('change bridge manager', function () {
        const managerOwner = accounts[0];
        const tokenOwner = accounts[6];

        beforeEach(async function () {
            this.manager = await FederatedManager.new(members, { from: managerOwner });
            this.token = await SideToken.new("MAIN", "MAIN", 18, this.manager.address, { from: tokenOwner });

            await this.manager.setTransferable(this.token.address);
        });

        it('vote new manager', async function() {
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes, 1);
        });

        it('enought votes to change manager', async function() {
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            await this.manager.voteNewManager(newmanager, { from: members[1] });
            await this.manager.voteNewManager(newmanager, { from: members[2] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, newmanager);
            
            const votes = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes, 0);
        });

        it('vote new manager only by a member', async function() {
            expectThrow(this.manager.voteNewManager(newmanager, { from: notmember }));
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes, 0);
        });

        it('vote new manager who is the manager', async function() {
            await this.manager.voteNewManager(this.manager.address, { from: members[0] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes = await this.manager.newManagerVotes(this.manager.address);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.newManagerNoVotes(this.manager.address);
            
            assert.equal(novotes, 0);
        });

        it('two votes new manager', async function() {
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            await this.manager.voteNewManager(newmanager, { from: members[1] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes);
            assert.equal(votes.length, 2);
            assert.equal(votes[0], members[0]);
            assert.equal(votes[1], members[1]);
            
            const novotes = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes, 2);
        });

        it('two repeated votes new manager', async function() {
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes, 1);
        });

        it('two votes to two new different managers', async function() {
            await this.manager.voteNewManager(newmanager, { from: members[0] });
            await this.manager.voteNewManager(newmanager2, { from: members[1] });
            
            const tokenManager = await this.token.manager();
            assert.equal(tokenManager, this.manager.address);
            
            const votes1 = await this.manager.newManagerVotes(newmanager);
            
            assert.ok(votes1);
            assert.equal(votes1.length, 1);
            assert.equal(votes1[0], members[0]);
            
            const votes2 = await this.manager.newManagerVotes(newmanager2);
            
            assert.ok(votes2);
            assert.equal(votes2.length, 1);
            assert.equal(votes2[0], members[1]);
            
            const novotes1 = await this.manager.newManagerNoVotes(newmanager);
            
            assert.equal(novotes1, 1);
            
            const novotes2 = await this.manager.newManagerNoVotes(newmanager2);
            
            assert.equal(novotes2, 1);
        });
    });
});

