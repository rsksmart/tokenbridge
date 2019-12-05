const Federation = artifacts.require('./Federation');
const MultiSigWallet = artifacts.require('./MultiSigWallet');
const AllowTokens = artifacts.require('./AllowTokens');
const Bridge = artifacts.require('./Bridge_v0');
const SideTokenFactory = artifacts.require('./SideTokenFactory');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('Federation', async function (accounts) {
    const deployer = accounts[0];
    const anAccount = accounts[1];
    const fedMember1 = accounts[2];
    const fedMember2 = accounts[3];
    const fedMember3 = accounts[4];

    it('should use constructor', async function () {
        await Federation.new([fedMember1, fedMember2], 1);
    });

    it('should fail if required is not the same as memebers length', async function () {
       await utils.expectThrow(Federation.new([fedMember1, fedMember2], 3))
    });

    beforeEach(async function () {
        this.members  = [fedMember1, fedMember2];
        this.federation = await Federation.new(this.members, 1);
    });

    describe('Members', async function () {
        it('should have initial values from constructor', async function () {
            let members = await this.federation.getMembers();
            assert.equal(members.length, this.members.length);
            assert.equal(members[0], this.members[0]);
            assert.equal(members[1], this.members[1]);

            let owner = await this.federation.owner();
            assert.equal(owner, deployer);
        });

        it('isMember should work correctly', async function() {
            let isMember = await this.federation.isMember(fedMember1);
            assert.equal(isMember, true);

            isMember = await this.federation.isMember(fedMember2);
            assert.equal(isMember, true);

            isMember = await this.federation.isMember(fedMember3);
            assert.equal(isMember, false);
        });

        describe('addMember', async function() {
            it('should be succesful', async function() {
                let receipt = await this.federation.addMember(fedMember3);
                utils.checkRcpt(receipt);

                let isMember = await this.federation.isMember(fedMember3);
                assert.equal(isMember, true);

                let members = await this.federation.getMembers();
                assert.equal(members.length, this.members.length + 1);
                assert.equal(members[2], fedMember3);
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federation.addMember(fedMember3, { from: fedMember1 }));
                await utils.expectThrow(this.federation.addMember(fedMember3, { from: anAccount }));

                let isMember = await this.federation.isMember(fedMember3);
                assert.equal(isMember, false);
                let members = await this.federation.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if already exists', async function() {
                await utils.expectThrow(this.federation.addMember(fedMember2));

                let isMember = await this.federation.isMember(fedMember2);
                assert.equal(isMember, true);
                let members = await this.federation.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if max members', async function() {
                for(i=2; i < 50; i++) {
                    await this.federation.addMember(randomHex(20));
                }

                await utils.expectThrow(this.federation.addMember(anAccount));

                let isMember = await this.federation.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.federation.getMembers();
                assert.equal(members.length, 50);
            });
        });

        describe('removeMember', async function() {
            it('should be succesful', async function() {
                let receipt = await this.federation.removeMember(fedMember1);
                utils.checkRcpt(receipt);

                let isMember = await this.federation.isMember(fedMember1);
                assert.equal(isMember, false);
                let members = await this.federation.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], fedMember2);
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federation.removeMember(fedMember3, { from: fedMember2 }));

                let isMember = await this.federation.isMember(fedMember3);
                assert.equal(isMember, false);
                let members = await this.federation.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if doesnt exists', async function() {
                await utils.expectThrow(this.federation.removeMember(anAccount, { from: fedMember1 }));

                let isMember = await this.federation.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.federation.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail when removing all members', async function() {
                await this.federation.removeMember(fedMember2);
                await utils.expectThrow(this.federation.removeMember(fedMember1));

                let isMember = await this.federation.isMember(fedMember1);
                assert.equal(isMember, true);
                let members = await this.federation.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], fedMember1);
            });
        });

        describe('changeRequirement', async function() {
            it('should be succesful', async function() {
                let receipt = await this.federation.changeRequirement(2);
                utils.checkRcpt(receipt);

                let required = await this.federation.required();
                assert.equal(required, 2);
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federation.changeRequirement(2, { from: anAccount }));

                let required = await this.federation.required();
                assert.equal(required, 1);
            });

            it('should fail if required bigger than memebers', async function() {
                await utils.expectThrow(this.federation.changeRequirement(3));

                let required = await this.federation.required();
                assert.equal(required, 1);
            });
        });

    });

    describe('Transactions', async function() {
        const originalTokenAddress = randomHex(20);
        const amount = web3.utils.toWei('10');
        const symbol = 'r';
        const blockHash = randomHex(32);
        const transactionHash = randomHex(32);
        const logIndex = 1;

        beforeEach(async function () {
            this.allowTokens = await AllowTokens.new(deployer);
            await this.allowTokens.addAllowedToken(originalTokenAddress);
            this.sideTokenFactory = await SideTokenFactory.new();
            this.bridge = await Bridge.new();
            await this.bridge.methods['initialize(address,address,address,address,string)'](deployer, this.federation.address, this.allowTokens.address, this.sideTokenFactory.address, 'e');
            await this.sideTokenFactory.transferPrimary(this.bridge.address);
            await this.federation.setBridge(this.bridge.address);
        });

        it('voteTransaction should be pending with 1/2 feds require 1', async function() {
            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);
            let transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be pending with 1/2 feds require 2', async function() {
            await this.federation.changeRequirement(2);
            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);
            let transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be successful with 2/2 feds require 1', async function() {
            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);
            let transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});
            utils.checkRcpt(receipt);

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/2 feds require 2', async function() {
            await this.federation.changeRequirement(2);
            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);
            let transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});
            utils.checkRcpt(receipt);

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds', async function() {
            this.federation.addMember(fedMember3);
            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});

            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            let count = await this.federation.getTransactionCount(transactionId, {from: fedMember2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds require 2', async function() {
            await this.federation.changeRequirement(2);
            this.federation.addMember(fedMember3);
            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});

            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            let count = await this.federation.getTransactionCount(transactionId, {from: fedMember2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should handle correctly already processed transaction', async function() {
            this.federation.addMember(fedMember3);
            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});

            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            let count = await this.federation.getTransactionCount(transactionId, {from: fedMember2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember3});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember3});
            assert.equal(hasVoted, false);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 3/3 feds require 3', async function() {
            this.federation.addMember(fedMember3);
            await this.federation.changeRequirement(3);
            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});

            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember2});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember2});
            assert.equal(hasVoted, true);

            let count = await this.federation.getTransactionCount(transactionId, {from: fedMember2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, false);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember3});

            hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember3});
            assert.equal(hasVoted, true);

            count = await this.federation.getTransactionCount(transactionId, {from: fedMember2});
            assert.equal(count, 3);

            transactionWasProcessed = await this.federation.transactionWasProcessed(transactionId, {from: fedMember2});
            assert.equal(transactionWasProcessed, true);

            transactionWasProcessed = await this.bridge.transactionWasProcessed(blockHash, transactionHash, anAccount, amount, logIndex);
            assert.equal(transactionWasProcessed, true);
        });

        it('should fail if not federation member', async function() {
            await utils.expectThrow(this.federation.voteTransaction(originalTokenAddress,
                anAccount, amount, symbol, blockHash, transactionHash, logIndex));
        });

        it('voteTransaction should be successfull if already voted', async function() {
            let transactionId = await this.federation.getTransactionId(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex);
            let transactionCount = await this.federation.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federation.hasVoted(transactionId, {from: fedMember1});
            assert.equal(hasVoted, true);

            receipt = await this.federation.voteTransaction(originalTokenAddress, anAccount, amount, symbol, blockHash, transactionHash, logIndex,
                {from: fedMember1});
            utils.checkRcpt(receipt);
        });

    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[5];
        const multiSigOnwerB = accounts[6];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.federation = await Federation.new([fedMember1, fedMember2], 2);
            this.federation.transferOwnership(this.multiSig.address);
        });

        it('should fail to add a new member due to missing signatures', async function() {
            let data = this.federation.contract.methods.addMember(fedMember3).encodeABI();
            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isMember = await this.federation.isMember(fedMember3);
            assert.equal(isMember, false);
        });

        it('should add a new member', async function() {
            let data = this.federation.contract.methods.addMember(fedMember3).encodeABI();

            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let isMember = await this.federation.isMember(fedMember3);
            assert.equal(isMember, true);
        });

        it('should fail to remove a federation member due to missing signatures', async function() {
            let data = this.federation.contract.methods.removeMember(fedMember1).encodeABI();
            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isMemeber = await this.federation.isMember(fedMember1);
            assert.equal(isMemeber, true);
        });

        it('should remove a federation member', async function() {
            data = this.federation.contract.methods.removeMember(fedMember1).encodeABI();
            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            isMember = await this.federation.isMember(fedMember1);
            assert.equal(isMember, false);
        });

        it('should fail to change requirement due to missing signatures', async function() {
            let data = this.federation.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let required = await this.federation.required();
            assert.equal(required, 2);
        });

        it('change requirement', async function() {
            let data = this.federation.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.federation.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let required = await this.federation.required();
            assert.equal(required, 2);
        });

    });

    describe('Ownable methods', async function() {

        it('Should renounce ownership', async function() {
            await this.federation.renounceOwnership();
            let owner = await this.federation.owner();
            assert.equal(parseInt(owner), 0);
        });

        it('Should not renounce ownership when not called by the owner', async function() {
            let owner = await this.federation.owner();
            await utils.expectThrow(this.federation.renounceOwnership({from: anAccount}));
            let ownerAfter = await this.federation.owner();
            assert.equal(owner, ownerAfter);
        });

        it('Should transfer ownership', async function() {
            await this.federation.transferOwnership(anAccount);
            let owner = await this.federation.owner();
            assert.equal(owner, anAccount);
        });

        it('Should not transfer ownership when not called by the owner', async function() {
            let owner = await this.federation.owner();
            await utils.expectThrow(this.federation.transferOwnership(anAccount, {from:fedMember1}));
            let ownerAfter = await this.federation.owner();
            assert.equal(owner, ownerAfter);
        });

    })
});
