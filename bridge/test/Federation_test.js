const Federation = artifacts.require('FederationV3');
const AllowTokens = artifacts.require('./AllowTokensV1.sol');
const Bridge = artifacts.require('./BridgeV3');
const SideTokenFactory = artifacts.require('./SideTokenFactory');

const truffleAssertions = require('truffle-assertions');
const utils = require('./utils');
const chains = require('../hardhat/helper/chains');
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

contract('FederationV3', async function (accounts) {
    const deployer = accounts[0];
    const anAccount = accounts[1];
    const federator1 = accounts[2];
    const federator2 = accounts[3];
    const federator3 = accounts[4];
    const bridge = utils.getRandomAddress();

    before(async function () {
        await utils.saveState();
    });

    after(async function () {
        await utils.revertState();
    });

    beforeEach(async function () {
        this.federators = await Federation.new();
    });

    describe('Initialization', async function() {
        it('should use initialize', async function () {
            await this.federators.initialize([federator1, federator2], 1, bridge, deployer);
        });

        it('should fail if required is not the same as memebers length', async function () {
            await truffleAssertions.fails(
                this.federators.initialize([federator1, federator2], 3, bridge, deployer),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('should fail if repeated memebers', async function () {
            await truffleAssertions.fails(
                this.federators.initialize([federator1, federator1], 2, bridge, deployer),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('should fail if null memeber', async function () {
            await truffleAssertions.fails(
                this.federators.initialize([federator1, utils.NULL_ADDRESS], 2, bridge, deployer),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('should fail if null bridge', async function () {
            await truffleAssertions.fails(
                this.federators.initialize([federator1], 1, utils.NULL_ADDRESS, deployer),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('should fail if bigger max memeber length', async function () {
            const members = [];
            for(let i = 0; i <= 50; i++) {
                members[i]=utils.getRandomAddress();
            }
            await truffleAssertions.fails(
                this.federators.initialize(members, 2, bridge, deployer),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('should be successful with max memeber length', async function () {
            const members = [];
            for(let i = 0; i < 50; i++) {
                members[i]=utils.getRandomAddress();
            }
            await this.federators.initialize(members, 2, bridge, deployer);
            const resultMembers = await this.federators.getMembers();
            assert.equal(resultMembers.length, 50);
        });
    });

    describe('After initialization', async function() {

        beforeEach(async function () {
            this.members  = [federator1, federator2];
            await this.federators.initialize(this.members, 1, bridge, deployer);
        });

        describe('Members', async function () {
            it('should have initial values from constructor', async function () {
                const members = await this.federators.getMembers();
                assert.equal(members.length, this.members.length);
                assert.equal(members[0], this.members[0]);
                assert.equal(members[1], this.members[1]);

                const owner = await this.federators.owner();
                assert.equal(owner, deployer);
            });

            it('should have correct version', async function () {
                const version = await this.federators.version();
                assert.equal(version, 'v3');
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
                const result = await this.federators.setBridge(anAccount);

                const bridge = await this.federators.bridge();
                assert.equal(bridge, anAccount);

                truffleAssertions.eventEmitted(result, 'BridgeChanged', (ev) => {
                    return ev.bridge === bridge;
                });
            });


            it('setBridge should fail if empty', async function() {
                await truffleAssertions.fails(
                    this.federators.setBridge(utils.NULL_ADDRESS),
                    truffleAssertions.ErrorType.REVERT
                );
            });

            describe('addMember', async function() {
                it('should be succesful', async function() {
                    const receipt = await this.federators.addMember(federator3);
                    utils.checkRcpt(receipt);

                    const isMember = await this.federators.isMember(federator3);
                    assert.equal(isMember, true);

                    const members = await this.federators.getMembers();
                    assert.equal(members.length, this.members.length + 1);
                    assert.equal(members[2], federator3);
                    truffleAssertions.eventEmitted(receipt, 'MemberAddition', (ev) => {
                        return ev.member === federator3;
                    });
                });

                it('should fail if not the owner', async function() {
                    await truffleAssertions.fails(
                        this.federators.addMember(federator3, { from: federator1 }),
                        truffleAssertions.ErrorType.REVERT
                    );
                    await truffleAssertions.fails(
                        this.federators.addMember(federator3, { from: anAccount }),
                        truffleAssertions.ErrorType.REVERT
                    );

                    const isMember = await this.federators.isMember(federator3);
                    assert.equal(isMember, false);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, this.members.length);
                });

                it('should fail if empty', async function() {
                    await truffleAssertions.fails(this.federators.addMember(utils.NULL_ADDRESS), truffleAssertions.ErrorType.REVERT);
                });

                it('should fail if already exists', async function() {
                    await truffleAssertions.fails(this.federators.addMember(federator2), truffleAssertions.ErrorType.REVERT);

                    const isMember = await this.federators.isMember(federator2);
                    assert.equal(isMember, true);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, this.members.length);
                });

                it('should fail if max members', async function() {
                    for(i=2; i < 50; i++) {
                        await this.federators.addMember(utils.getRandomAddress());
                    }

                    await truffleAssertions.fails(this.federators.addMember(anAccount), truffleAssertions.ErrorType.REVERT);

                    const isMember = await this.federators.isMember(anAccount);
                    assert.equal(isMember, false);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, 50);
                });
            });

            describe('removeMember', async function() {
                it('should be succesful with 1 required and 2 members', async function() {
                    const receipt = await this.federators.removeMember(federator1);
                    utils.checkRcpt(receipt);

                    const isMember = await this.federators.isMember(federator1);
                    assert.equal(isMember, false);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, 1);
                    assert.equal(members[0], federator2);

                    truffleAssertions.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                        return ev.member === federator1;
                    });
                });

                it('should be succesful with 2 required and 3 memebers', async function() {
                    await this.federators.changeRequirement(2);

                    await this.federators.addMember(federator3);
                    let members = await this.federators.getMembers();
                    assert.equal(members.length, 3);

                    const receipt = await this.federators.removeMember(federator1);
                    utils.checkRcpt(receipt);

                    const isMember = await this.federators.isMember(federator1);
                    assert.equal(isMember, false);
                    members = await this.federators.getMembers();
                    assert.equal(members.length, 2);
                    assert.equal(members[0], federator3);

                    truffleAssertions.eventEmitted(receipt, 'MemberRemoval', (ev) => {
                        return ev.member === federator1;
                    });
                });

                it('should fail if lower than required', async function() {
                    await this.federators.changeRequirement(2);
                    let members = await this.federators.getMembers();
                    assert.equal(members.length, 2);

                    await truffleAssertions.fails(this.federators.removeMember(federator1), truffleAssertions.ErrorType.REVERT);

                    members = await this.federators.getMembers();
                    assert.equal(members.length, 2);
                });

                it('should fail if not the owner', async function() {
                    await truffleAssertions.fails(
                        this.federators.removeMember(federator1, { from: federator2 }),
                        truffleAssertions.ErrorType.REVERT
                    );

                    const isMember = await this.federators.isMember(federator1);
                    assert.equal(isMember, true);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, this.members.length);
                });

                it('should fail if nulll address', async function() {
                    await truffleAssertions.fails(this.federators.removeMember(utils.NULL_ADDRESS), truffleAssertions.ErrorType.REVERT);
                });

                it('should fail if doesnt exists', async function() {
                    await truffleAssertions.fails(this.federators.removeMember(anAccount), truffleAssertions.ErrorType.REVERT);

                    const isMember = await this.federators.isMember(anAccount);
                    assert.equal(isMember, false);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, this.members.length);
                });

                it('should fail when removing all members', async function() {
                    await this.federators.removeMember(federator2);
                    await truffleAssertions.fails(this.federators.removeMember(federator1), truffleAssertions.ErrorType.REVERT);

                    const isMember = await this.federators.isMember(federator1);
                    assert.equal(isMember, true);
                    const members = await this.federators.getMembers();
                    assert.equal(members.length, 1);
                    assert.equal(members[0], federator1);
                });
            });

            describe('changeRequirement', async function() {
                it('should be succesful', async function() {
                    const receipt = await this.federators.changeRequirement(2);
                    utils.checkRcpt(receipt);

                    const required = await this.federators.required();
                    assert.equal(required, 2);

                    truffleAssertions.eventEmitted(receipt, 'RequirementChange', (ev) => {
                        return parseInt(ev.required) === 2;
                    });
                });

                it('should fail if not the owner', async function() {
                    await truffleAssertions.fails(
                        this.federators.changeRequirement(2, { from: anAccount }),
                        truffleAssertions.ErrorType.REVERT
                    );

                    const required = await this.federators.required();
                    assert.equal(required, 1);
                });

                it('should fail if less than 2', async function() {
                    await this.federators.changeRequirement(2);
                    await truffleAssertions.fails(this.federators.changeRequirement(1), truffleAssertions.ErrorType.REVERT);

                    const required = await this.federators.required();
                    assert.equal(required, 2);
                });

                it('should fail if required bigger than memebers', async function() {
                    await truffleAssertions.fails(this.federators.changeRequirement(3), truffleAssertions.ErrorType.REVERT);

                    let required = await this.federators.required();
                    assert.equal(required, 1);
                });
            });

            const arrayMembersToString = (array) => {
                const result = []
                for (const element of array) {
                    result.push(element.toString());
                }
                return result;
            }

            describe('emitHeartbeat', async function() {
                const fedRskChainId = '30';
                const fedEthChainId = '1';
                const fedBscChainId = '56';
                const federatorVersion = '2.0.0';
                const nodeRskInfo = 'rskjar/2.2.0';
                const nodeEthInfo = 'geth/1.13.15';
                const nodeBscInfo = 'geth/1.1.5';
                const fedRskBlock = '123456';
                const fedEthBlock = '999000000';
                const fedBscBlock = '999000000';

                it('should be succesful', async function() {
                    const receipt = await this.federators.emitHeartbeat(
                        fedRskBlock,
                        fedEthBlock,
                        federatorVersion,
                        nodeRskInfo,
                        nodeEthInfo,
                        {from: federator1}
                    );
                    utils.checkRcpt(receipt);

                    assert.equal(receipt.logs[0].event, 'HeartBeat');
                    assert.equal(receipt.logs[0].args[0], federator1);
                    assert.equal(receipt.logs[0].args[1], fedRskBlock );
                    assert.equal(receipt.logs[0].args[2], fedEthBlock);
                    assert.equal(receipt.logs[0].args[3], federatorVersion);
                    assert.equal(receipt.logs[0].args[4], nodeRskInfo);
                    assert.equal(receipt.logs[0].args[5], nodeEthInfo);
                });

                it('should fail if not a memeber', async function() {
                    await truffleAssertions.fails(
                        this.federators.emitHeartbeat(
                            fedRskBlock,
                            fedEthBlock,
                            federatorVersion,
                            nodeRskInfo,
                            nodeEthInfo,
                            {from: anAccount}
                        ),
                        truffleAssertions.ErrorType.REVERT
                    );
                });
            });
        });

        describe('Transactions', async function() {
            const originalTokenAddress = utils.getRandomAddress();
            const amount = web3.utils.toWei('10');
            const blockHash = utils.getRandomHash();
            const transactionHash = utils.getRandomHash();
            const logIndex = new BN(1);
            const decimals = 18;
            const typeId = 0;

            beforeEach(async function () {
                this.allowTokens = await AllowTokens.new();
                await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                    deployer,
                    deployer,
                    '0',
                    '0',
                    '0',
                    [{
                        description:'RIF',
                        limits:{
                            max:toWei('10000'),
                            min:toWei('1'),
                            daily:toWei('100000'),
                            mediumAmount:toWei('2'),
                            largeAmount:toWei('3')
                        }
                    }]
                );

                await this.allowTokens.setToken(originalTokenAddress, typeId);
                this.sideTokenFactory = await SideTokenFactory.new();
                this.bridge = await Bridge.new();
                await this.bridge.methods['initialize(address,address,address,address,string)']
                (
                    deployer,
                    this.federators.address,
                    this.allowTokens.address,
                    this.sideTokenFactory.address,
                    'bd'
                );
                    await this.sideTokenFactory.transferPrimary(this.bridge.address);
                await this.allowTokens.transferPrimary(this.bridge.address);
                await this.federators.setBridge(this.bridge.address);

                await this.bridge.createSideToken(
                    typeId,
                    originalTokenAddress,
                    decimals,
                    'MAIN',
                    'MAIN');
            });

            it('voteTransaction should be successful with 1/1 federators require 1', async function() {
                this.federators.removeMember(federator2)
                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, false);

                const receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, true);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);

                let transactionDataHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let bridgeTransactionDataWasProcessed = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(transactionDataHash, bridgeTransactionDataWasProcessed);

                truffleAssertions.eventEmitted(receipt, 'Voted', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });

                truffleAssertions.eventEmitted(receipt, 'Executed', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });
            });

            it('voteTransaction should fail with wrong acceptTransfer arguments', async function() {
                this.federators.removeMember(federator2);
                const wrongTokenAddress = "0x0000000000000000000000000000000000000000";
                const transactionId = await this.federators.getTransactionId(
                    wrongTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, false);

                await truffleAssertions.fails(
                    this.federators.voteTransaction(
                        wrongTokenAddress,
                        anAccount,
                        anAccount,
                        amount,
                        blockHash,
                        transactionHash,
                        logIndex,
                        {from: federator1}
                    ),
                    truffleAssertions.ErrorType.REVERT
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                const bridgeTransactionId = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                transactionWasProcessed = await this.bridge.hasCrossed(bridgeTransactionId);
                assert.equal(transactionWasProcessed, false);
            });

            it('voteTransaction should be pending with 1/2 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                const transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                const receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, false);

                truffleAssertions.eventEmitted(receipt, 'Voted', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });

                truffleAssertions.eventNotEmitted(receipt, 'Executed');
            });

            it('voteTransaction should be pending with 1/2 feds require 2 and voted twice', async function() {
                await this.federators.changeRequirement(2);
                const transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                const receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                await truffleAssertions.fails(
                    this.federators.voteTransaction(
                        originalTokenAddress,
                        anAccount,
                        anAccount,
                        amount,
                        blockHash,
                        transactionHash,
                        logIndex,
                        {from: federator1}
                    ),
                    truffleAssertions.ErrorType.REVERT
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, false);

                truffleAssertions.eventEmitted(receipt, 'Voted', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });

                truffleAssertions.eventNotEmitted(receipt, 'Executed');
            });

            it('voteTransaction should be successful with 2/2 feds require 1', async function() {
                const transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/2 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                const transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/3 feds', async function() {
                this.federators.addMember(federator3);

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                let hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                const receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                const hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/3 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                this.federators.addMember(federator3);

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                let hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should handle correctly already processed transaction', async function() {
                this.federators.addMember(federator3);

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                let hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);

                await truffleAssertions.fails(
                    this.federators.voteTransaction(
                        originalTokenAddress,
                        anAccount,
                        anAccount,
                        amount,
                        blockHash,
                        transactionHash,
                        logIndex,
                        {from: federator3}
                    ),
                    truffleAssertions.ErrorType.REVERT
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 3/3 feds require 3', async function() {
                await this.federators.addMember(federator3);
                await this.federators.changeRequirement(3);

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                );

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);
                let hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                let hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, false);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator2}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, false);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, false);

                let bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, utils.NULL_HASH);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, false);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator3}
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
                hasVotedFederator2 = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVotedFederator2, true);
                hasVotedFederator3 = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVotedFederator3, true);

                count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 3);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('should fail if not federators member', async function() {
                await truffleAssertions.fails(
                    this.federators.voteTransaction(originalTokenAddress,
                        anAccount, anAccount, amount, blockHash, transactionHash, logIndex
                    ),
                    truffleAssertions.ErrorType.REVERT
                );
            });

            it('voteTransaction should be successfull if already voted', async function() {
                const transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex
                );
                const transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, false);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);

                await truffleAssertions.fails(
                    this.federators.voteTransaction(
                        originalTokenAddress,
                        anAccount,
                        anAccount,
                        amount,
                        blockHash,
                        transactionHash,
                        logIndex,
                        {from: federator1}
                    ),
                    truffleAssertions.ErrorType.REVERT
                );

                hasVotedFederator1 = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVotedFederator1, true);
            });
        });

        describe('Ownable methods', async function() {

            it('Should renounce ownership', async function() {
                await this.federators.renounceOwnership();
                const owner = await this.federators.owner();
                assert.equal(parseInt(owner), 0);
            });

            it('Should not renounce ownership when not called by the owner', async function() {
                const owner = await this.federators.owner();
                await truffleAssertions.fails(
                    this.federators.renounceOwnership({from: anAccount}),
                    truffleAssertions.ErrorType.REVERT
                );
                const ownerAfter = await this.federators.owner();
                assert.equal(owner, ownerAfter);
            });

            it('Should transfer ownership', async function() {
                await this.federators.transferOwnership(anAccount);
                const owner = await this.federators.owner();
                assert.equal(owner, anAccount);
            });

            it('Should not transfer ownership when not called by the owner', async function() {
                const owner = await this.federators.owner();
                await truffleAssertions.fails(
                    this.federators.transferOwnership(anAccount, {from:federator1}),
                    truffleAssertions.ErrorType.REVERT
                );
                const ownerAfter = await this.federators.owner();
                assert.equal(owner, ownerAfter);
            });

        });

    });
});
