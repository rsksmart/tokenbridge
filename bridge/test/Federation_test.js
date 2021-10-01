const Federation = artifacts.require('Federation');
const AllowTokens = artifacts.require('./AllowTokens');
const Bridge = artifacts.require('./Bridge');
const NftBridge = artifacts.require("./NFTBridge");
const NFTERC721TestToken = artifacts.require("./NFTERC721TestToken");
const SideTokenFactory = artifacts.require('./SideTokenFactory');

const truffleAssert = require('truffle-assertions');
const utils = require('./utils');
const chains = require('../hardhat/helper/chains');
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

contract('Federation', async function (accounts) {
    const deployer = accounts[0];
    const anAccount = accounts[1];
    const anotherAccount = accounts[5];
    const federator1 = accounts[2];
    const federator2 = accounts[3];
    const federator3 = accounts[4];
    const bridge = utils.getRandomAddress();
    const bridgeNFT = utils.getRandomAddress();

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
            await this.federators.initialize([federator1, federator2], 1, bridge, deployer, bridgeNFT);
        });

        it('should fail if required is not the same as memebers length', async function () {
        await utils.expectThrow(this.federators.initialize([federator1, federator2], 3, bridge, deployer, bridgeNFT));
        });

        it('should fail if repeated memebers', async function () {
            await utils.expectThrow(this.federators.initialize([federator1, federator1], 2, bridge, deployer, bridgeNFT));
        });

        it('should fail if null memeber', async function () {
            await utils.expectThrow(this.federators.initialize([federator1, utils.NULL_ADDRESS], 2, bridge, deployer, bridgeNFT));
        });

        it('should fail if null bridge', async function () {
            await utils.expectThrow(this.federators.initialize([federator1], 1, utils.NULL_ADDRESS, deployer, bridgeNFT));
        });

        it('should fail if bigger max memeber length', async function () {
            let members = [];
            for(let i = 0; i <= 50; i++) {
                members[i]=utils.getRandomAddress();
            }
            await utils.expectThrow(this.federators.initialize(members, 2, bridge, deployer));
        });

        it('should be successful with max memeber length', async function () {
            let members = [];
            for(let i = 0; i < 50; i++) {
                members[i]=utils.getRandomAddress();
            }
            await this.federators.initialize(members, 2, bridge, deployer, bridgeNFT);
            let resultMembers = await this.federators.getMembers();
            assert.equal(resultMembers.length, 50);
        });
    });

    describe('After initialization', async function() {

        beforeEach(async function () {
            this.members  = [federator1, federator2];
            await this.federators.initialize(this.members, 1, bridge, deployer, bridgeNFT);
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

            it('should have correct version', async function () {
                let version = await this.federators.version();
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
                let result = await this.federators.setBridge(anAccount);

                let bridge = await this.federators.bridge();
                assert.equal(bridge, anAccount);

                truffleAssert.eventEmitted(result, 'BridgeChanged', (ev) => {
                    return ev.bridge === bridge;
                });
            });

            it('should set NFT bridge correctly', async function() {
                let receipt = await this.federators.setNFTBridge(bridgeNFT);
                utils.checkRcpt(receipt)

                let _bridgeNFT = await this.federators.bridgeNFT();
                assert.equal(_bridgeNFT.toLowerCase(), bridgeNFT.toLowerCase());

                truffleAssert.eventEmitted(receipt, 'NFTBridgeChanged', (ev) => {
                    return ev.bridgeNFT === _bridgeNFT;
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
                        await this.federators.addMember(utils.getRandomAddress());
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

                it('should fail if less than 2', async function() {
                    await this.federators.changeRequirement(2);
                    await utils.expectThrow(this.federators.changeRequirement(1));

                    let required = await this.federators.required();
                    assert.equal(required, 2);
                });

                it('should fail if required bigger than memebers', async function() {
                    await utils.expectThrow(this.federators.changeRequirement(3));

                    let required = await this.federators.required();
                    assert.equal(required, 1);
                });
            });

            describe('emitHeartbeat', async function() {
                it('should be succesful', async function() {
                    const fedRskBlock = '123456';
                    const fedEthBlock = '999000000';
                    const federatorVersion = '2.0.0';
                    const nodeRskInfo = 'rskjar/2.2.0';
                    const nodeEthInfo = 'geth/1.10.2';
                    let receipt = await this.federators.emitHeartbeat(fedRskBlock,fedEthBlock, federatorVersion, nodeRskInfo, nodeEthInfo, {from: federator1});
                    utils.checkRcpt(receipt);

                    assert.equal(receipt.logs[0].event, 'HeartBeat');
                    assert.equal(receipt.logs[0].args[0], federator1);
                    assert.equal(receipt.logs[0].args[1], fedRskBlock);
                    assert.equal(receipt.logs[0].args[2], fedEthBlock);
                    assert.equal(receipt.logs[0].args[3], federatorVersion);
                    assert.equal(receipt.logs[0].args[4], nodeRskInfo);
                    assert.equal(receipt.logs[0].args[5], nodeEthInfo);
                });

                it('should fail if not a memeber', async function() {
                    const fedRskBlock = '123456';
                    const fedEthBlock = '999000000';
                    const federatorVersion = '2.0.0';
                    const nodeRskInfo = 'rskjar/2.2.0';
                    const nodeEthInfo = 'geth/1.10.2';
                    await utils.expectThrow(this.federators.emitHeartbeat(fedRskBlock,fedEthBlock, federatorVersion, nodeRskInfo, nodeEthInfo, {from: deployer}));
                });

            });

        });

        describe('Transactions', async function() {
            const originalTokenAddress = utils.getRandomAddress();
            const amount = web3.utils.toWei('10');
            const symbol = 'e';
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

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, originalTokenAddress, typeId);
                this.sideTokenFactory = await SideTokenFactory.new();
                this.bridge = await Bridge.new();
                await this.bridge.methods['initialize(address,address,address,address,string)'](deployer, this.federators.address,
                    this.allowTokens.address, this.sideTokenFactory.address, symbol);
                    await this.sideTokenFactory.transferPrimary(this.bridge.address);
                await this.allowTokens.transferPrimary(this.bridge.address);
                await this.federators.setBridge(this.bridge.address);

                await this.bridge.createSideToken(
                    typeId,
                    originalTokenAddress,
                    decimals,
                    'MAIN',
                    'MAIN',
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );
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
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                const receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
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
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                );
                let bridgeTransactionDataWasProcessed = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(transactionDataHash, bridgeTransactionDataWasProcessed);

                truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });

                truffleAssert.eventEmitted(receipt, 'Executed', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });
            });

            it('voteTransaction should fail with wrong acceptTransfer arguments', async function() {
                this.federators.removeMember(federator2);
                const wrongTokenAddress = "0x0000000000000000000000000000000000000000";
                let transactionId = await this.federators.getTransactionId(
                    wrongTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                await utils.expectThrow(this.federators.voteTransaction(
                    wrongTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1})
                );

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, false);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                const bridgeTransactionId = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                transactionWasProcessed = await this.bridge.hasCrossed(bridgeTransactionId);
                assert.equal(transactionWasProcessed, false);
            });

            it('voteTransaction should be pending with 1/2 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 1);

                let transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator1});
                assert.equal(transactionWasProcessed, false);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, false);

                truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                    return ev.federator === federator1 && ev.transactionId === transactionId;
                });

                truffleAssert.eventNotEmitted(receipt, 'Executed');
            });

            it('voteTransaction should be successful with 2/2 feds require 1', async function() {
                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );
                utils.checkRcpt(receipt);

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/2 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );
                utils.checkRcpt(receipt);

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/3 feds', async function() {
                this.federators.addMember(federator3);
                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 2/3 feds require 2', async function() {
                await this.federators.changeRequirement(2);
                this.federators.addMember(federator3);
                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should handle correctly already processed transaction', async function() {
                this.federators.addMember(federator3);
                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

                let count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 2);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                const bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator3}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVoted, false);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);
            });

            it('voteTransaction should be successful with 3/3 feds require 3', async function() {
                await this.federators.addMember(federator3);
                await this.federators.changeRequirement(3);
                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );

                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                );

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator2}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator2});
                assert.equal(hasVoted, true);

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
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator3}
                );

                hasVoted = await this.federators.hasVoted(transactionId, {from: federator3});
                assert.equal(hasVoted, true);

                count = await this.federators.getTransactionCount(transactionId, {from: federator2});
                assert.equal(count, 3);

                transactionWasProcessed = await this.federators.transactionWasProcessed(transactionId, {from: federator2});
                assert.equal(transactionWasProcessed, true);

                const expectedHash = await this.bridge.getTransactionDataHash(anAccount, amount, blockHash, transactionHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID);
                bridgeTransactionHash = await this.bridge.transactionsDataHashes(transactionHash);
                assert.equal(bridgeTransactionHash, expectedHash);

                transactionWasProcessed = await this.bridge.hasCrossed(transactionHash);
                assert.equal(transactionWasProcessed, true);
            });

            it('should fail if not federators member', async function() {
                await utils.expectThrow(this.federators.voteTransaction(originalTokenAddress,
                    anAccount, anAccount, amount, blockHash, transactionHash, logIndex, utils.tokenType.COIN, chains.HARDHAT_TEST_NET_CHAIN_ID));
            });

            it('voteTransaction should be successfull if already voted', async function() {
                let transactionId = await this.federators.getTransactionId(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                let receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);

                let hasVoted = await this.federators.hasVoted(transactionId, {from: federator1});
                assert.equal(hasVoted, true);

                receipt = await this.federators.voteTransaction(
                    originalTokenAddress,
                    anAccount,
                    anAccount,
                    amount,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.COIN,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    {from: federator1}
                );
                utils.checkRcpt(receipt);
            });

            it('should fail since NFT bridge address is random', async function() {
              let receipt = await this.federators.voteTransaction(
                originalTokenAddress,
                anAccount,
                anotherAccount,
                amount,
                blockHash,
                transactionHash,
                logIndex,
                utils.tokenType.NFT,
                chains.HARDHAT_TEST_NET_CHAIN_ID,
                { from: federator1 }
              );
              utils.checkRcpt(receipt);

              await truffleAssert.fails(
                this.federators.voteTransaction(
                  originalTokenAddress,
                  anAccount,
                  anotherAccount,
                  amount,
                  blockHash,
                  transactionHash,
                  logIndex,
                  utils.tokenType.NFT,
                  chains.HARDHAT_TEST_NET_CHAIN_ID,
                  { from: federator2 }
                ),
                'reverted',
                'function call to a non-contract account'
              );
            });

            describe('NFTBridge', async function() {
              const tokenId = new BN(9);
              const tokenName = "The Drops";
              const tokenSymbol = "drop";
              const tokenBaseURI = "ipfs:/";
              const tokenContractURI = "https://api-mainnet.rarible.com/contractMetadata";

              beforeEach(async function () {
                this.NFTBridge = await NftBridge.new();
                await this.NFTBridge.methods[
                  "initialize(address,address,address,address,string)"
                ](
                  deployer,
                  this.federators.address,
                  this.allowTokens.address,
                  this.sideTokenFactory.address,
                  symbol
                );

                this.NFTtoken = await NFTERC721TestToken.new(tokenName, tokenSymbol, {
                  from: deployer,
                });
                this.NFTtoken.setBaseURI(tokenBaseURI);
                this.NFTtoken.setContractURI(tokenContractURI);

                await this.federators.setNFTBridge(this.NFTBridge.address);
              });

              it('should vote successfully', async function() {
                let receipt = await this.NFTtoken.safeMint(deployer, tokenId, {
                  from: deployer,
                });
                utils.checkRcpt(receipt);

                receipt = await this.NFTtoken.approve(this.NFTBridge.address, tokenId, {
                  from: deployer,
                });
                utils.checkRcpt(receipt);

                receipt = await this.NFTBridge.receiveTokensTo(
                  this.NFTtoken.address,
                  anotherAccount,
                  tokenId,
                  { from: deployer }
                );
                utils.checkRcpt(receipt);

                let transactionId = await this.federators.getTransactionId(
                  this.NFTtoken.address,
                  anAccount,
                  anotherAccount,
                  tokenId,
                  blockHash,
                  transactionHash,
                  logIndex,
                  chains.HARDHAT_TEST_NET_CHAIN_ID
                );
                let transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 0);

                receipt = await this.federators.voteTransaction(
                    this.NFTtoken.address,
                    anAccount,
                    anotherAccount,
                    tokenId,
                    blockHash,
                    transactionHash,
                    logIndex,
                    utils.tokenType.NFT,
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    { from: federator1 }
                );
                utils.checkRcpt(receipt);

                truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                  return ev.federator === federator1
                    && ev.transactionHash === transactionHash
                    && ev.transactionId === transactionId
                    && ev.originalTokenAddress === this.NFTtoken.address
                    && ev.sender === anAccount
                    && ev.receiver === anotherAccount
                    && ev.amount.eq(tokenId)
                    && ev.blockHash === blockHash
                    && ev.logIndex.eq(logIndex);
                });

                let hasVoted = await this.federators.hasVoted(transactionId, { from: federator1 });
                assert.equal(hasVoted, true);

                receipt = await this.federators.voteTransaction(
                  this.NFTtoken.address,
                  anAccount,
                  anotherAccount,
                  tokenId,
                  blockHash,
                  transactionHash,
                  logIndex,
                  utils.tokenType.NFT,
                  chains.HARDHAT_TEST_NET_CHAIN_ID,
                  { from: federator2 }
                );
                utils.checkRcpt(receipt);

                truffleAssert.eventEmitted(receipt, 'Voted', (ev) => {
                  return ev.federator === federator2
                    && ev.transactionHash === transactionHash
                    && ev.transactionId === transactionId
                    && ev.originalTokenAddress === this.NFTtoken.address
                    && ev.sender === anAccount
                    && ev.receiver === anotherAccount
                    && ev.amount.eq(tokenId)
                    && ev.blockHash === blockHash
                    && ev.logIndex.eq(logIndex);
                });

                truffleAssert.eventEmitted(receipt, 'Executed', (ev) => {
                  return ev.federator === federator2
                    && ev.transactionHash === transactionHash
                    && ev.transactionId === transactionId
                    && ev.originalTokenAddress === this.NFTtoken.address
                    && ev.sender === anAccount
                    && ev.receiver === anotherAccount
                    && ev.amount.eq(tokenId)
                    && ev.blockHash === blockHash
                    && ev.logIndex.eq(logIndex);
                });

                hasVoted = await this.federators.hasVoted(transactionId, { from: federator2 });
                assert.equal(hasVoted, true);

                transactionCount = await this.federators.getTransactionCount(transactionId);
                assert.equal(transactionCount, 2);
              });
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

        });

    });
});
