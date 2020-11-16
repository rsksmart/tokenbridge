const Validators = artifacts.require('./Validators_v2');
const MultiSigWallet = artifacts.require('./MultiSigWallet');
const AllowTokens = artifacts.require('./AllowTokens');
const Bridge = artifacts.require('./Bridge_v2');
const SideTokenFactory = artifacts.require('./SideTokenFactory_v1');
const UtilsContract = artifacts.require('./Utils');

const truffleAssert = require('truffle-assertions');
const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('Validators_v2', async function (accounts) {
    const deployer = accounts[0];
    const anAccount = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];

    it('should use constructor', async function () {
        await Validators.new([validator1, validator2], 1);
    });

    it('should fail if required is not the same as memebers length', async function () {
       await utils.expectThrow(Validators.new([validator1, validator2], 3));
    });

    it('should fail if repeated memebers', async function () {
        await utils.expectThrow(Validators.new([validator1, validator1], 2));
     });

     it('should fail if null memeber', async function () {
        await utils.expectThrow(Validators.new([validator1, utils.NULL_ADDRESS], 2));
     });

     it('should fail if bigger max memeber length', async function () {
        let members = [];
        for(let i = 0; i <= 50; i++) {
            members[i]=randomHex(20);
        }
        await utils.expectThrow(Validators.new(members, 2));
     });

     it('should be successful with max memeber length', async function () {
        let members = [];
        for(let i = 0; i < 50; i++) {
            members[i]=randomHex(20);
        }
        let validators = await Validators.new(members, 2);
        let resultMembers = await validators.getMembers();
        assert.equal(resultMembers.length, 50);
     });

    beforeEach(async function () {
        this.members  = [validator1, validator2];
        this.validators = await Validators.new(this.members, 1);
    });

    describe('Members', async function () {
        it('should have initial values from constructor', async function () {
            let members = await this.validators.getMembers();
            assert.equal(members.length, this.members.length);
            assert.equal(members[0], this.members[0]);
            assert.equal(members[1], this.members[1]);

            let owner = await this.validators.owner();
            assert.equal(owner, deployer);
        });

        it('isMember should work correctly', async function() {
            let isMember = await this.validators.isMember(validator1);
            assert.equal(isMember, true);

            isMember = await this.validators.isMember(validator2);
            assert.equal(isMember, true);

            isMember = await this.validators.isMember(validator3);
            assert.equal(isMember, false);
        });

        it('setBridge should work correctly', async function() {
            let result = await this.validators.setBridge(anAccount);

            let bridge = await this.validators.bridge();
            assert.equal(bridge, anAccount);

            truffleAssert.eventEmitted(result, 'BridgeChanged', (ev) => {
                return ev.bridge === bridge;
            });
        });

        it('setBridge should fail if empty', async function() {
            await utils.expectThrow(this.validators.setBridge(utils.NULL_ADDRESS));
        });

        describe('addMember', async function() {
            it('should be succesful', async function() {
                let receipt = await this.validators.addMember(validator3);
                utils.checkRcpt(receipt);

                let isMember = await this.validators.isMember(validator3);
                assert.equal(isMember, true);

                let members = await this.validators.getMembers();
                assert.equal(members.length, this.members.length + 1);
                assert.equal(members[2], validator3);
                truffleAssert.eventEmitted(receipt, 'MemberAddition', (ev) => {
                    return ev.member === validator3;
                });
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.validators.addMember(validator3, { from: validator1 }));
                await utils.expectThrow(this.validators.addMember(validator3, { from: anAccount }));

                let isMember = await this.validators.isMember(validator3);
                assert.equal(isMember, false);
                let members = await this.validators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if empty', async function() {
                await utils.expectThrow(this.validators.addMember(utils.NULL_ADDRESS));
            });

            it('should fail if already exists', async function() {
                await utils.expectThrow(this.validators.addMember(validator2));

                let isMember = await this.validators.isMember(validator2);
                assert.equal(isMember, true);
                let members = await this.validators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if max members', async function() {
                for(i=2; i < 50; i++) {
                    await this.validators.addMember(randomHex(20));
                }

                await utils.expectThrow(this.validators.addMember(anAccount));

                let isMember = await this.validators.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.validators.getMembers();
                assert.equal(members.length, 50);
            });
        });

        describe('removeMember', async function() {
            it('should be succesful with 1 required and 2 members', async function() {
                let receipt = await this.validators.removeMember(validator1);
                utils.checkRcpt(receipt);

                let isMember = await this.validators.isMember(validator1);
                assert.equal(isMember, false);
                let members = await this.validators.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], validator2);

                truffleAssert.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                    return ev.member === validator1;
                });
            });

            it('should be succesful with 2 required and 3 memebers', async function() {
                await this.validators.changeRequirement(2);

                await this.validators.addMember(validator3);
                let members = await this.validators.getMembers();
                assert.equal(members.length, 3);

                let receipt = await this.validators.removeMember(validator1);
                utils.checkRcpt(receipt);

                let isMember = await this.validators.isMember(validator1);
                assert.equal(isMember, false);
                members = await this.validators.getMembers();
                assert.equal(members.length, 2);
                assert.equal(members[0], validator3);

                truffleAssert.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                    return ev.member === validator1;
                });
            });

            it('should fail if lower than required', async function() {
                await this.validators.changeRequirement(2);
                let members = await this.validators.getMembers();
                assert.equal(members.length, 2);

                await utils.expectThrow(this.validators.removeMember(validator1));

                members = await this.validators.getMembers();
                assert.equal(members.length, 2);
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.validators.removeMember(validator1, { from: validator2 }));

                let isMember = await this.validators.isMember(validator1);
                assert.equal(isMember, true);
                let members = await this.validators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail if nulll address', async function() {
                await utils.expectThrow(this.validators.removeMember(utils.NULL_ADDRESS));
            });

            it('should fail if doesnt exists', async function() {
                await utils.expectThrow(this.validators.removeMember(anAccount));

                let isMember = await this.validators.isMember(anAccount);
                assert.equal(isMember, false);
                let members = await this.validators.getMembers();
                assert.equal(members.length, this.members.length);
            });

            it('should fail when removing all members', async function() {
                await this.validators.removeMember(validator2);
                await utils.expectThrow(this.validators.removeMember(validator1));

                let isMember = await this.validators.isMember(validator1);
                assert.equal(isMember, true);
                let members = await this.validators.getMembers();
                assert.equal(members.length, 1);
                assert.equal(members[0], validator1);
            });
        });

        describe('changeRequirement', async function() {
            it('should be succesful', async function() {
                let receipt = await this.validators.changeRequirement(2);
                utils.checkRcpt(receipt);

                let required = await this.validators.required();
                assert.equal(required, 2);

                truffleAssert.eventEmitted(receipt, 'RequirementChange', (ev) => {
                    return parseInt(ev.required) === 2;
                });
            });

            it('should fail if not the owner', async function() {
                await utils.expectThrow(this.validators.changeRequirement(2, { from: anAccount }));

                let required = await this.validators.required();
                assert.equal(required, 1);
            });

            it('should fail if required bigger than memebers', async function() {
                await utils.expectThrow(this.validators.changeRequirement(3));

                let required = await this.validators.required();
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
            this.allowTokens = await AllowTokens.new(deployer);
            await this.allowTokens.addAllowedToken(originalTokenAddress);
            this.sideTokenFactory = await SideTokenFactory.new();
            this.utilsContract = await UtilsContract.deployed();
            await Bridge.link(UtilsContract, this.utilsContract.address);
            this.bridge = await Bridge.new();
            await this.bridge.methods['initialize(address,address,address,address,string)'](deployer, this.validators.address,
                this.allowTokens.address, this.sideTokenFactory.address, 'e');
            await this.sideTokenFactory.transferPrimary(this.bridge.address);
            await this.validators.setBridge(this.bridge.address);
        });

        it('voteTransaction should be successful with 1/1 validators require 1', async function() {
            this.validators.removeMember(validator2)
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);

            truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                return ev.validator === validator1 && ev.transactionId === transactionId;
            });

            truffleAssert.eventEmitted(receipt, 'Executed', (ev) => {
                return ev.transactionId === transactionId;
            });
        });

        it('voteTransaction should fail with wrong acceptTransfer arguments', async function() {
            this.validators.removeMember(validator2);
            const wrongTokenAddress = "0x0000000000000000000000000000000000000000";
            let transactionId = await this.validators.getTransactionId(wrongTokenAddress, {sender:anAccount, receiver:anAccount,amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            await utils.expectThrow(this.validators.voteTransaction(wrongTokenAddress, {sender:anAccount, receiver:anAccount,amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1}));

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, false);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be pending with 1/2 validators require 1', async function() {
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);
        });

        it('voteTransaction should be pending with 1/2 feds require 2', async function() {
            await this.validators.changeRequirement(2);
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);

            truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                return ev.validator === validator1 && ev.transactionId === transactionId;
            });

            truffleAssert.eventNotEmitted(receipt, 'Executed');
        });

        it('voteTransaction should be successful with 2/2 feds require 1', async function() {
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});
            utils.checkRcpt(receipt);

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/2 feds require 2', async function() {
            await this.validators.changeRequirement(2);
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 1);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});
            utils.checkRcpt(receipt);

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds', async function() {
            this.validators.addMember(validator3);
            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});

            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            let count = await this.validators.getTransactionCount(transactionId, {from: validator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 2/3 feds require 2', async function() {
            await this.validators.changeRequirement(2);
            this.validators.addMember(validator3);
            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});

            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            let count = await this.validators.getTransactionCount(transactionId, {from: validator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should handle correctly already processed transaction', async function() {
            this.validators.addMember(validator3);
            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});

            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            let count = await this.validators.getTransactionCount(transactionId, {from: validator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator3});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator3});
            assert.equal(hasVoted, false);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);
        });

        it('voteTransaction should be successful with 3/3 feds require 3', async function() {
            await this.validators.addMember(validator3);
            await this.validators.changeRequirement(3);
            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});

            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            let transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator1});
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator2});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator2});
            assert.equal(hasVoted, true);

            let count = await this.validators.getTransactionCount(transactionId, {from: validator2});
            assert.equal(count, 2);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, false);

            let bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, false);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator3});

            hasVoted = await this.validators.hasVoted(transactionId, {from: validator3});
            assert.equal(hasVoted, true);

            count = await this.validators.getTransactionCount(transactionId, {from: validator2});
            assert.equal(count, 3);

            transactionWasProcessed = await this.validators.transactionWasProcessed(transactionId, {from: validator2});
            assert.equal(transactionWasProcessed, true);

            bridgeTransactionId = await this.bridge.getTransactionId(blockHash, transactionHash, anAccount, amount, logIndex);
            transactionWasProcessed = await this.bridge.processed(bridgeTransactionId);
            assert.equal(transactionWasProcessed, true);
        });

        it('should fail if not validators member', async function() {
            await utils.expectThrow(this.validators.voteTransaction(originalTokenAddress,
                anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity));
        });

        it('voteTransaction should be successfull if already voted', async function() {
            let transactionId = await this.validators.getTransactionId(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity});
            let transactionCount = await this.validators.getTransactionCount(transactionId);
            assert.equal(transactionCount, 0);

            let receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);

            let hasVoted = await this.validators.hasVoted(transactionId, {from: validator1});
            assert.equal(hasVoted, true);

            receipt = await this.validators.voteTransaction(originalTokenAddress, {sender:anAccount, receiver:anAccount, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity},
                {from: validator1});
            utils.checkRcpt(receipt);
        });

    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[5];
        const multiSigOnwerB = accounts[6];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.validators = await Validators.new([validator1, validator2], 2);
            this.validators.transferOwnership(this.multiSig.address);
        });

        it('should fail to add a new member due to missing signatures', async function() {
            let data = this.validators.contract.methods.addMember(validator3).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isMember = await this.validators.isMember(validator3);
            assert.equal(isMember, false);
        });

        it('should add a new member', async function() {
            let data = this.validators.contract.methods.addMember(validator3).encodeABI();

            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let isMember = await this.validators.isMember(validator3);
            assert.equal(isMember, true);
        });

        it('should fail to remove a validators member due to missing signatures', async function() {
            let data = this.validators.contract.methods.addMember(validator3).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            data = this.validators.contract.methods.removeMember(validator1).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, false);

            let isMemeber = await this.validators.isMember(validator1);
            assert.equal(isMemeber, true);
        });

        it('should remove a validators member', async function() {
            let data = this.validators.contract.methods.addMember(validator3).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            data = this.validators.contract.methods.removeMember(validator1).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, true);

            isMember = await this.validators.isMember(validator1);
            assert.equal(isMember, false);
        });

        it('should fail to change requirement due to missing signatures', async function() {
            let data = this.validators.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let required = await this.validators.required();
            assert.equal(required, 2);
        });

        it('change requirement', async function() {
            let data = this.validators.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.validators.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let required = await this.validators.required();
            assert.equal(required, 2);
        });

    });

    describe('Ownable methods', async function() {

        it('Should renounce ownership', async function() {
            await this.validators.renounceOwnership();
            let owner = await this.validators.owner();
            assert.equal(parseInt(owner), 0);
        });

        it('Should not renounce ownership when not called by the owner', async function() {
            let owner = await this.validators.owner();
            await utils.expectThrow(this.validators.renounceOwnership({from: anAccount}));
            let ownerAfter = await this.validators.owner();
            assert.equal(owner, ownerAfter);
        });

        it('Should transfer ownership', async function() {
            await this.validators.transferOwnership(anAccount);
            let owner = await this.validators.owner();
            assert.equal(owner, anAccount);
        });

        it('Should not transfer ownership when not called by the owner', async function() {
            let owner = await this.validators.owner();
            await utils.expectThrow(this.validators.transferOwnership(anAccount, {from:validator1}));
            let ownerAfter = await this.validators.owner();
            assert.equal(owner, ownerAfter);
        });

    })
});
