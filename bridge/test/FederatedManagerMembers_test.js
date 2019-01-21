const FederatedManager = artifacts.require('./FederatedManager');

const expectThrow = require('./utils').expectThrow;

contract('FederatedManager', function (accounts) {
    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
    const newmember = accounts[6];
    const newmember2 = accounts[7];
    const notmember = accounts[0];
    const oldmember = members[members.length - 1];
    const oldmember2 = members[members.length - 2];
    
    describe('add member', function () {
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members);
        });

        it('vote add member', async function() {
            await this.manager.voteAddMember(newmember, { from: members[0] });
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes, 1);
        });

        it('enought votes to add member', async function() {
            await this.manager.voteAddMember(newmember, { from: members[0] });
            await this.manager.voteAddMember(newmember, { from: members[1] });
            await this.manager.voteAddMember(newmember, { from: members[2] });
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, true);
            
            const votes = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes, 0);
        });

        it('vote add member only by a member', async function() {
            expectThrow(this.manager.voteAddMember(newmember, { from: accounts[0] }));
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes, 0);
        });

        it('vote add member who is a member', async function() {
            await this.manager.voteAddMember(members[1], { from: members[0] });
            
            const ismember = await this.manager.isMember(members[1]);
            assert.equal(ismember, true);
            
            const votes = await this.manager.addMemberVotes(members[1]);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.addMemberNoVotes(members[1]);
            
            assert.equal(novotes, 0);
        });

        it('two votes add member', async function() {
            await this.manager.voteAddMember(newmember, { from: members[0] });
            await this.manager.voteAddMember(newmember, { from: members[1] });
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 2);
            assert.equal(votes[0], members[0]);
            assert.equal(votes[1], members[1]);
            
            const novotes = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes, 2);
        });

        it('two repeated votes add member', async function() {
            await this.manager.voteAddMember(newmember, { from: members[0] });
            await this.manager.voteAddMember(newmember, { from: members[0] });
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes, 1);
        });

        it('two votes to add two different members', async function() {
            await this.manager.voteAddMember(newmember, { from: members[0] });
            await this.manager.voteAddMember(newmember2, { from: members[1] });
            
            const ismember = await this.manager.isMember(newmember);
            assert.equal(ismember, false);
            
            const ismember2 = await this.manager.isMember(newmember2);
            assert.equal(ismember2, false);
            
            const votes1 = await this.manager.addMemberVotes(newmember);
            
            assert.ok(votes1);
            assert.equal(votes1.length, 1);
            assert.equal(votes1[0], members[0]);
            
            const votes2 = await this.manager.addMemberVotes(newmember2);
            
            assert.ok(votes2);
            assert.equal(votes2.length, 1);
            assert.equal(votes2[0], members[1]);
            
            const novotes1 = await this.manager.addMemberNoVotes(newmember);
            
            assert.equal(novotes1, 1);
            
            const novotes2 = await this.manager.addMemberNoVotes(newmember2);
            
            assert.equal(novotes2, 1);
        });
    });
    
    describe('remove member', function () {
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members);
        });

        it('vote remove member', async function() {
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, true);
            
            const votes = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes, 1);
        });

        it('enought votes to remove member', async function() {
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            await this.manager.voteRemoveMember(oldmember, { from: members[1] });
            await this.manager.voteRemoveMember(oldmember, { from: members[2] });
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes, 0);
        });

        it('vote remove member only by a member', async function() {
            expectThrow(this.manager.voteRemoveMember(oldmember, { from: accounts[0] }));
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, true);
            
            const votes = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes, 0);
        });

        it('vote remove member who is not a member', async function() {
            await this.manager.voteRemoveMember(notmember, { from: members[0] });
            
            const ismember = await this.manager.isMember(notmember);
            assert.equal(ismember, false);
            
            const votes = await this.manager.removeMemberVotes(notmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 0);
            
            const novotes = await this.manager.removeMemberNoVotes(notmember);
            
            assert.equal(novotes, 0);
        });

        it('two votes remove member', async function() {
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            await this.manager.voteRemoveMember(oldmember, { from: members[1] });
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, true);
            
            const votes = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 2);
            assert.equal(votes[0], members[0]);
            assert.equal(votes[1], members[1]);
            
            const novotes = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes, 2);
        });

        it('two repeated votes remove member', async function() {
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, true);
            
            const votes = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes);
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes, 1);
        });

        it('two votes to add two different members', async function() {
            await this.manager.voteRemoveMember(oldmember, { from: members[0] });
            await this.manager.voteRemoveMember(oldmember2, { from: members[1] });
            
            const ismember = await this.manager.isMember(oldmember);
            assert.equal(ismember, true);
            
            const ismember2 = await this.manager.isMember(oldmember2);
            assert.equal(ismember2, true);
            
            const votes1 = await this.manager.removeMemberVotes(oldmember);
            
            assert.ok(votes1);
            assert.equal(votes1.length, 1);
            assert.equal(votes1[0], members[0]);
            
            const votes2 = await this.manager.removeMemberVotes(oldmember2);
            
            assert.ok(votes2);
            assert.equal(votes2.length, 1);
            assert.equal(votes2[0], members[1]);
            
            const novotes1 = await this.manager.removeMemberNoVotes(oldmember);
            
            assert.equal(novotes1, 1);
            
            const novotes2 = await this.manager.removeMemberNoVotes(oldmember2);
            
            assert.equal(novotes2, 1);
        });
    });
});

