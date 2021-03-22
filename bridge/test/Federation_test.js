const Federation = artifacts.require('./Federation');
const MultiSigWallet = artifacts.require('./MultiSigWallet');
const AllowTokens = artifacts.require('./AllowTokens');
const Bridge = artifacts.require('./Bridge');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const UtilsContract = artifacts.require('./Utils');

const truffleAssert = require('truffle-assertions');
const utils = require('./utils');
const randomHex = web3.utils.randomHex;
const toWei = web3.utils.toWei;

contract('Federation', async function (accounts) {
    const deployer = accounts[0];
    const anAccount = accounts[1];
    const federator1 = accounts[2];
    const federator2 = accounts[3];
    const federator3 = accounts[4];

    it('should use constructor', async function () {
        await Federation.new([federator1, federator2], 1);
    });

    it('should fail if required is not the same as memebers length', async function () {
       await utils.expectThrow(Federation.new([federator1, federator2], 3));
    });

    it('should fail if repeated memebers', async function () {
        await utils.expectThrow(Federation.new([federator1, federator1], 2));
     });

     it('should fail if null memeber', async function () {
        await utils.expectThrow(Federation.new([federator1, utils.NULL_ADDRESS], 2));
     });

     it('should fail if bigger max memeber length', async function () {
        let members = [];
        for(let i = 0; i <= 50; i++) {
            members[i]=randomHex(20);
        }
        await utils.expectThrow(Federation.new(members, 2));
     });

     it('should be successful with max memeber length', async function () {
        let members = [];
        for(let i = 0; i < 50; i++) {
            members[i]=randomHex(20);
        }
        let federators = await Federation.new(members, 2);
        let resultMembers = await federators.getMembers();
        assert.equal(resultMembers.length, 50);
     });

    beforeEach(async function () {
        this.members  = [federator1, federator2];
        this.federators = await Federation.new(this.members, 1);
    });

    describe('Members', async function () {
        it('should have initial values from constructor', async function () {
            let members = await this.federators.getMembers();
            assert.equal(members.length, this.members.length);
            assert.equal(members[0], this.members[0]);
            assert.equal(members[1], this.members[1]);

            let owner = await this.federators.owner();
            assert.equal(owner, deployer);
        });

        it('isMember should work correctly', async function() {
            let isMember = await this.federators.isMember(federator1);
            assert.equal(isMember, true);

            isMember = await this.federators.isMember(federator2);
            assert.equal(isMember, true);

            isMember = await this.federators.isMember(federator3);
            assert.equal(isMember, false);
        });

        it('setBridge should work correctly', async function() {
            let result = await this.federators.setBridge(anAccount);

            let bridge = await this.federators.bridge();
            assert.equal(bridge, anAccount);

            truffleAssert.eventEmitted(result, 'BridgeChanged', (ev) => {
                return ev.bridge === bridge;
            });
        });

        it('setBridge should fail if empty', async function() {
            await utils.expectThrow(this.federators.setBridge(utils.NULL_ADDRESS));
        });

        describe('addMember', async function() {
            it('should be succesful', async function() {
                let receipt = await this.federators.addMember(federator3);
                utils.checkRcpt(receipt);

                let isMember = await this.federators.isMember(federator3);
                assert.equal(isMember, true);

                let members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length + 1);
                assert.equal(members[2], federator3);
                truffleAssert.eventEmitted(receipt, 'MemberAddition', (ev) => {
                    return ev.member === federator3;
                });
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federators.addMember(federator3, { from: federator1 }));
                await utils.expectThrow(this.federators.addMember(federator3, { from: anAccount }));

                let isMember = await this.federators.isMember(federator3);
                assert.equal(isMember, false);
                let members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if empty', async function() {
                await utils.expectThrow(this.federators.addMember(utils.NULL_ADDRESS));
            });

            it('should fail if already exists', async function() {
                await utils.expectThrow(this.federators.addMember(federator2));

                let isMember = await this.federators.isMember(federator2);
                assert.equal(isMember, true);
                let members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if max members', async function() {
                for(i=2; i < 50; i++) {
                    await this.federators.addMember(randomHex(20));
                }

                await utils.expectThrow(this.federators.addMember(anAccount));

                let isMember = await this.federators.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.federators.getMembers();
                assert.equal(members.length, 50);
            });
        });

        describe('removeMember', async function() {
            it('should be succesful with 1 required and 2 members', async function() {
                let receipt = await this.federators.removeMember(federator1);
                utils.checkRcpt(receipt);

                let isMember = await this.federators.isMember(federator1);
                assert.equal(isMember, false);
                let members = await this.federators.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], federator2);

                truffleAssert.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                    return ev.member === federator1;
                });
            });

            it('should be succesful with 2 required and 3 memebers', async function() {
                await this.federators.changeRequirement(2);

                await this.federators.addMember(federator3);
                let members = await this.federators.getMembers();
                assert.equal(members.length, 3);

                let receipt = await this.federators.removeMember(federator1);
                utils.checkRcpt(receipt);

                let isMember = await this.federators.isMember(federator1);
                assert.equal(isMember, false);
                members = await this.federators.getMembers();
                assert.equal(members.length, 2);
                assert.equal(members[0], federator3);

                truffleAssert.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                    return ev.member === federator1;
                });
            });

            it('should fail if lower than required', async function() {
                await this.federators.changeRequirement(2);
                let members = await this.federators.getMembers();
                assert.equal(members.length, 2);

                await utils.expectThrow(this.federators.removeMember(federator1));

                members = await this.federators.getMembers();
                assert.equal(members.length, 2);
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federators.removeMember(federator1, { from: federator2 }));

                let isMember = await this.federators.isMember(federator1);
                assert.equal(isMember, true);
                let members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if nulll address', async function() {
                await utils.expectThrow(this.federators.removeMember(utils.NULL_ADDRESS));
            });

            it('should fail if doesnt exists', async function() {
                await utils.expectThrow(this.federators.removeMember(anAccount));

                let isMember = await this.federators.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail when removing all members', async function() {
                await this.federators.removeMember(federator2);
                await utils.expectThrow(this.federators.removeMember(federator1));

                let isMember = await this.federators.isMember(federator1);
                assert.equal(isMember, true);
                let members = await this.federators.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], federator1);
            });
        });

        describe('changeRequirement', async function() {
            it('should be succesful', async function() {
                let receipt = await this.federators.changeRequirement(2);
                utils.checkRcpt(receipt);

                let required = await this.federators.required();
                assert.equal(required, 2);

                truffleAssert.eventEmitted(receipt, 'RequirementChange', (ev) => {
                    return parseInt(ev.required) === 2;
                });
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.federators.changeRequirement(2, { from: anAccount }));

                let required = await this.federators.required();
                assert.equal(required, 1);
            });

            it('should fail if required bigger than memebers', async function() {
                await utils.expectThrow(this.federators.changeRequirement(3));

                let required = await this.federators.required();
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
        const decimals = 18;
        const granularity = 1;


        beforeEach(async function () {
            this.allowTokens = await AllowTokens.new();
            await this.allowTokens.methods['initialize(address,address)'](deployer, deployer);
            await this.allowTokens.addTokenType('RIF', {max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')});
            let typeId = 0;
            await this.allowTokens.setToken(originalTokenAddress, typeId);
            this.sideTokenFactory = await SideTokenFactory.new();
            this.utilsContract = await UtilsContract.deployed();
            await Bridge.link(UtilsContract, this.utilsContract.address);
            this.bridge = await Bridge.new();
            await this.bridge.methods['initialize(address,address,address,address,string)'](deployer, this.federators.address,
                this.allowTokens.address, this.sideTokenFactory.address, 'e');
            await this.sideTokenFactory.transferPrimary(this.bridge.address);
            await this.federators.setBridge(this.bridge.address);
        });

        it('voteTransaction should be successful with 1/1 federators require 1', async function() {
            this.federators.removeMember(federator2)
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);

            truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                return ev.federator === federator1 && ev.transactionId === transactionId;
            });

            truffleAssert.eventEmitted(receipt, 'Executed', (ev) => {
                return ev.transactionId === transactionId;
            });
        });

        it('voteTransaction should fail with wrong acceptTransfer arguments', async function() {
            this.federators.removeMember(federator2);
            const wrongTokenAddress = "0x0000000000000000000000000000000000000000";
            let transactionId = await this.federators.getTransactionId(wrongTokenAddress, {sender:anAccount, receiver:anAccount,amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            await utils.expectThrow(this.federators.voteTransaction(wrongTokenAddress, {sender:anAccount, receiver:anAccount,amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1}));

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, false);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be pending with 1/2 federators require 1', async function() {
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be pending with 1/2 feds require 2', async function() {
            await this.federators.changeRequirement(2);
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);

            truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                return ev.federator === federator1 && ev.transactionId === transactionId;
            });

            truffleAssert.eventNotEmitted(receipt, 'Executed');
        });

        it('voteTransaction should be successful with 2/2 feds require 1', async function() {
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});
            utils.checkRcpt(receipt);

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/2 feds require 2', async function() {
            await this.federators.changeRequirement(2);
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});
            utils.checkRcpt(receipt);

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds', async function() {
            this.federators.addMember(federator3);
            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});

            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds require 2', async function() {
            await this.federators.changeRequirement(2);
            this.federators.addMember(federator3);
            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});

            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should handle correctly already processed transaction', async function() {
            this.federators.addMember(federator3);
            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});

            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator3});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator3});
            assert.equal(hasVoted, false);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 3/3 feds require 3', async function() {
            await this.federators.addMember(federator3);
            await this.federators.changeRequirement(3);
            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});

            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator2});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
            assert.equal(hasVoted, true);

            let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator3});

            hasVoted = await this.federators.hasVoted(transactionId, {from: federator3});
            assert.equal(hasVoted, true);

            count = await this.federators.getTransactionCount(transactionId, {from: federator2});
            assert.equal(count, 3);

            transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
            assert.equal(transactionWasProcessed, true);

            bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('should fail if not federators member', async function() {
            await utils.expectThrow(this.federators.voteTransaction(originalTokenAddress,
                anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity));
        });

        it('voteTransaction should be successfull if already voted', async function() {
            let transactionId = await this.federators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.federators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
            assert.equal(hasVoted, true);

            receipt = await this.federators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: federator1});
            utils.checkRcpt(receipt);
        });

    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[5];
        const multiSigOnwerB = accounts[6];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.federators = await Federation.new([federator1, federator2], 2);
            this.federators.transferOwnership(this.multiSig.address);
        });

        it('should fail to add a new member due to missing signatures', async function() {
            let data = this.federators.contract.methods.addMember(federator3).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isMember = await this.federators.isMember(federator3);
            assert.equal(isMember, false);
        });

        it('should add a new member', async function() {
            let data = this.federators.contract.methods.addMember(federator3).encodeABI();

            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let isMember = await this.federators.isMember(federator3);
            assert.equal(isMember, true);
        });

        it('should fail to remove a federators member due to missing signatures', async function() {
            let data = this.federators.contract.methods.addMember(federator3).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            data = this.federators.contract.methods.removeMember(federator1).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, false);

            let isMemeber = await this.federators.isMember(federator1);
            assert.equal(isMemeber, true);
        });

        it('should remove a federators member', async function() {
            let data = this.federators.contract.methods.addMember(federator3).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            data = this.federators.contract.methods.removeMember(federator1).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, true);

            isMember = await this.federators.isMember(federator1);
            assert.equal(isMember, false);
        });

        it('should fail to change requirement due to missing signatures', async function() {
            let data = this.federators.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let required = await this.federators.required();
            assert.equal(required, 2);
        });

        it('change requirement', async function() {
            let data = this.federators.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.federators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let required = await this.federators.required();
            assert.equal(required, 2);
        });

    });

    describe('Ownable methods', async function() {

        it('Should renounce ownership', async function() {
            await this.federators.renounceOwnership();
            let owner = await this.federators.owner();
            assert.equal(parseInt(owner), 0);
        });

        it('Should not renounce ownership when not called by the owner', async function() {
            let owner = await this.federators.owner();
            await utils.expectThrow(this.federators.renounceOwnership({from: anAccount}));
            let ownerAfter = await this.federators.owner();
            assert.equal(owner, ownerAfter);
        });

        it('Should transfer ownership', async function() {
            await this.federators.transferOwnership(anAccount);
            let owner = await this.federators.owner();
            assert.equal(owner, anAccount);
        });

        it('Should not transfer ownership when not called by the owner', async function() {
            let owner = await this.federators.owner();
            await utils.expectThrow(this.federators.transferOwnership(anAccount, {from:federator1}));
            let ownerAfter = await this.federators.owner();
            assert.equal(owner, ownerAfter);
        });

    })
});
