const FederatedManager = artifacts.require('./FederatedManager');
const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Custodian = artifacts.require('./Custodian');

const expectThrow = require('./utils').expectThrow;

contract('FederatedManager', function (accounts) {
    const members = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
    const newmember = accounts[6];
    const newmember2 = accounts[7];
    
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

    describe('accept transfer using custodian', function () {
        const managerOwner = accounts[0];
        const tokenOwner = accounts[6];
        const custodianOwner = accounts[7];
        const anAccount = accounts[8];
        
        beforeEach(async function () {
            this.manager = await FederatedManager.new(members, { from: managerOwner });
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
            this.custodian = await Custodian.new(this.manager.address, this.token.address, { from: custodianOwner });

            await this.token.transfer(this.custodian.address, 1000, { from: tokenOwner });
            await this.manager.setTransferable(this.custodian.address);
        });
        
        it('initial state', async function () {
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const custodianBalance = await this.token.balanceOf(this.custodian.address);
            assert.equal(custodianBalance, 1000);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('two votes of five no accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const custodianBalance = await this.token.balanceOf(this.custodian.address);
            assert.equal(custodianBalance, 1000);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
        });
        
        it('three votes of five then accept transfer', async function () {
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[0] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[1] });
            await this.manager.voteTransaction(1, 2, 3, anAccount, 100, { from: members[2] });
            
            const tokenOwnerBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenOwnerBalance, 9000);

            const custodianBalance = await this.token.balanceOf(this.custodian.address);
            assert.equal(custodianBalance, 900);

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

            const custodianBalance = await this.token.balanceOf(this.custodian.address);
            assert.equal(custodianBalance, 900);

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
});

