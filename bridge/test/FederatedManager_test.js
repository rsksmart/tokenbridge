const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');

const expectThrow = require('./utils').expectThrow;

contract('FederatedManager', function (accounts) {
    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
    const newmember = accounts[6];
    const newmember2 = accounts[7];
    const notmember = accounts[0];
    const oldmember = members[members.length - 1];
    const oldmember2 = members[members.length - 2];
    const newmanager = accounts[8];
    const newmanager2 = accounts[9];
    
    describe('members and votes', function () {
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
            
            const novotes = await this.manager.transactionNoVotes(1, 2, 3, 4, 5);
            
            assert.equal(novotes, 0);
        });

        it('one vote for transaction', async function() {
            await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: members[0] });
            
            const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
            
            const novotes = await this.manager.transactionNoVotes(1, 2, 3, 4, 5);
            
            assert.equal(novotes, 1);
        });

        it('vote only member', async function() {
            expectThrow(this.manager.voteTransaction(1, 2, 3, 4, 5));
            
            const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 0);
        });

        it('two votes for transaction', async function() {
            await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: members[1] });
            
            const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 2);
            assert.equal(votes[0], members[0]);
            assert.equal(votes[1], members[1]);
            
            const novotes = await this.manager.transactionNoVotes(1, 2, 3, 4, 5);
            
            assert.equal(novotes, 2);
        });

        it('two repeated votes for transaction', async function() {
            await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, 4, 5, { from: members[0] });
            
            const votes = await this.manager.transactionVotes(1, 2, 3, 4, 5);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 1);
            assert.equal(votes[0], members[0]);
        });
    });
    
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

    describe('transferable', function () {
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members);
        });
        
        it('set transferable', async function () {
            await this.manager.setTransferable(accounts[6]);
            
            const transferable = await this.manager.transferable();
            
            assert.equal(transferable, accounts[6]);
        });
        
        it('set transferable only owner', async function () {
            expectThrow(this.manager.setTransferable(accounts[6], { from: accounts[1] }));
            
            const transferable = await this.manager.transferable();
            
            assert.equal(transferable, 0);
        });
        
        it('set transferable only once', async function () {
            await this.manager.setTransferable(accounts[6]);
            expectThrow(this.manager.setTransferable(accounts[7]));
            
            const transferable = await this.manager.transferable();
            
            assert.equal(transferable, accounts[6]);
        });
    });

    describe('accept transfer using bridge', function () {
        const managerOwner = accounts[0];
        const tokenOwner = accounts[6];
        const bridgeOwner = accounts[7];
        const anAccount = accounts[8];
        
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members, { from: managerOwner });
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
            this.bridge = await Bridge.new(this.manager.address, this.token.address, { from: bridgeOwner });

            await this.token.transfer(this.bridge.address, 1000, { from: tokenOwner });
            await this.manager.setTransferable(this.bridge.address);
        });
        
        it('initial state', async function () {
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 1000);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('two votes of five no accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 1000);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('three votes of five then accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[2] });
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 900);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 100);

            const votes = await this.manager.transactionVotes(1, 2, 3, anAccount, 100);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 0);
        });
        
        it('four votes of five only one accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[2] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[3] });
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 900);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 100);

            const votes = await this.manager.transactionVotes(1, 2, 3, anAccount, 100);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 0);
        });
    });

    describe('accept transfer using side token', function () {
        const managerOwner = accounts[0];
        const tokenOwner = accounts[6];
        const anAccount = accounts[7];
        
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members, { from: managerOwner });
            this.token = await SideToken.new("MAIN", "MAIN", 18, this.manager.address, { from: tokenOwner });

            await this.manager.setTransferable(this.token.address);
        });
        
        it('initial state', async function () {
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 0);

            const managerBalance = await this.token.balanceOf(this.manager.address);
            assert.equal(managerBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('two votes of five no accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });

            const processed = await this.manager.transactionWasProcessed(1, 2, 3, anAccount, 100);
            assert.equal(processed, false);
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 0);

            const managerBalance = await this.token.balanceOf(this.manager.address);
            assert.equal(managerBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('three votes of five then accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[2] });
            
            const processed = await this.manager.transactionWasProcessed(1, 2, 3, anAccount, 100);
            assert.equal(processed, true);
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 0);

            const managerBalance = await this.token.balanceOf(this.manager.address);
            assert.equal(managerBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 100);

            const votes = await this.manager.transactionVotes(1, 2, 3, anAccount, 100);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 0);
        });
        
        it('four votes of five only one accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[2] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[3] });
            
            const processed = await this.manager.transactionWasProcessed(1, 2, 3, anAccount, 100);
            assert.equal(processed, true);

            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 0);

            const managerBalance = await this.token.balanceOf(this.manager.address);
            assert.equal(managerBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 100);

            const votes = await this.manager.transactionVotes(1, 2, 3, anAccount, 100);

            assert.ok(votes);
            assert.ok(Array.isArray(votes));
            assert.equal(votes.length, 0);
        });
    });

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
            expectThrow(this.manager.voteNewManager(newmanager, { from: accounts[0] }));
            
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

