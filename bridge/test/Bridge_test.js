const MainToken = artifacts.require('./MainToken');
const AlternativeERC20Detailed = artifacts.require('./AlternativeERC20Detailed');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');
const AllowTokens = artifacts.require('./AllowTokens');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const mockReceiveTokensCall = artifacts.require('./mockReceiveTokensCall');
const WRBTC = artifacts.require('./WRBTC');

const utils = require('./utils');
const chains = require('../hardhat/helper/chains');
const truffleAssert = require('truffle-assertions');
const ethUtil = require('ethereumjs-util');

const BN = web3.utils.BN;
const ONE_DAY = 24*3600;
const toWei = web3.utils.toWei;

const keccak256 = web3.utils.keccak256;

async function getClaimDigest(
    bridge,
    claim, //{address _to,uint256 _amount,bytes32 _transactionHash,address _relayer,uint256 _fee},
    nonce,
    deadline
) {
    const CLAIM_TYPEHASH = await bridge.CLAIM_TYPEHASH();
    const DOMAIN_SEPARATOR = await bridge.domainSeparator();

    return web3.utils.soliditySha3(
        {t:'bytes1', v:'0x19'},
        {t:'bytes1', v:'0x01'},
        {t:'bytes32', v:DOMAIN_SEPARATOR},
        {t:'bytes32', v:keccak256(
                web3.eth.abi.encodeParameters(
                    ['bytes32', 'address', 'uint256', 'bytes32', 'address', 'uint256', 'uint256', 'uint256'],
                    [CLAIM_TYPEHASH, claim.to, claim.amount, claim.transactionHash, claim.relayer, claim.fee, nonce, deadline]
                )
            )
        }
    )
}

contract('Bridge', async function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const federation = accounts[5];
    const tokenName = 'MAIN';
    const tokenSymbol = 'MAIN';

    before(async function () {
        await utils.saveState();
    });

    after(async function () {
        await utils.revertState();
    });

    beforeEach(async function () {
        this.token = await MainToken.new(tokenName, tokenSymbol, 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
        this.allowTokens = await AllowTokens.new();
        await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
            bridgeManager,
            bridgeOwner,
            '0',
            '0',
            '0',
            [{
                description:'MAIN',
                limits:{
                    max:toWei('10000'),
                    min:toWei('1'),
                    daily:toWei('100000'),
                    mediumAmount:toWei('2'),
                    largeAmount:toWei('3')
                }
            }]
        );
        this.typeId = 0;
        await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: bridgeManager });
        this.sideTokenFactory = await SideTokenFactory.new();
        this.bridge = await Bridge.new();
        await this.bridge.methods['initialize(address,address,address,address,string)'](bridgeManager,
            federation, this.allowTokens.address, this.sideTokenFactory.address, 'e');
        await this.sideTokenFactory.transferPrimary(this.bridge.address);
        await this.allowTokens.transferPrimary(this.bridge.address, { from: bridgeOwner });
    });

    describe('Main network', async function () {

        it('should retrieve the version', async function () {
            const result = await this.bridge.version();
            assert.equal(result, "v3");
        });

        describe('owner', async function () {
            it('check manager', async function () {
                const manager = await this.bridge.owner();
                assert.equal(manager, bridgeManager);
            });

            it('change manager', async function () {
                const receipt = await this.bridge.transferOwnership(newBridgeManager, { from: bridgeManager });
                utils.checkRcpt(receipt);
                const manager = await this.bridge.owner();
                assert.equal(manager, newBridgeManager);
            });

            it('only manager can change manager', async function () {
                await utils.expectThrow(this.bridge.transferOwnership(newBridgeManager));
                const manager = await this.bridge.owner();
                assert.equal(manager, bridgeManager);
            });

            it('change allowTokens', async function () {
                let allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, this.allowTokens.address);
                const receipt = await this.bridge.changeAllowTokens(anAccount, { from: bridgeManager });
                utils.checkRcpt(receipt);
                allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, anAccount);
            });

            it('only manager can change allowTokens', async function () {
                let allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, this.allowTokens.address);
                await utils.expectThrow(this.bridge.changeAllowTokens(anAccount, { from: tokenOwner }));
                allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, this.allowTokens.address);
            });

            it('change allowTokens fail if zero address', async function () {
                let allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, this.allowTokens.address);
                await utils.expectThrow(this.bridge.changeAllowTokens(utils.NULL_ADDRESS, { from: bridgeManager }));
                allowTokens = await this.bridge.allowTokens();
                assert.equal(allowTokens, this.allowTokens.address);
            });

            it('setFeePercentage successful', async function () {
                const payment = 999; //9.99%
                const feePercentageDivider = (await this.bridge.feePercentageDivider()).toNumber();
                await this.bridge.setFeePercentage(payment, { from: bridgeManager});
                let result = await this.bridge.getFeePercentage();
                assert.equal(result, payment);
                assert.equal((9.99/100).toFixed(4), payment/feePercentageDivider);
            });

            it('setFeePercentage should fail if not the owner', async function () {
                const payment = 1000;
                await utils.expectThrow(this.bridge.setFeePercentage(payment, { from: tokenOwner}));
                let result = await this.bridge.getFeePercentage();
                assert.equal(result, 0);
            });

            it('setFeePercentage should fail if 10% or more', async function () {
                const payment = await this.bridge.feePercentageDivider()/10;
                await utils.expectThrow(this.bridge.setFeePercentage(payment, { from: bridgeManager}));
            });


            it('check federation', async function () {
                const federationAddress = await this.bridge.getFederation();
                assert.equal(federationAddress, federation);
            });

            it('change federation', async function () {
                const receipt = await this.bridge.changeFederation(newBridgeManager, { from: bridgeManager });
                utils.checkRcpt(receipt);
                const federationAddress = await this.bridge.getFederation();
                assert.equal(federationAddress, newBridgeManager);
            });

            it('only manager can change the federation', async function () {
                await utils.expectThrow(this.bridge.changeFederation(newBridgeManager));
                const federationAddress = await this.bridge.getFederation();
                assert.equal(federationAddress, federation);
            });

            it('change federation new fed cant be null', async function () {
                await utils.expectThrow(this.bridge.changeFederation(utils.NULL_ADDRESS, { from: bridgeManager }));
                const federationAddress = await this.bridge.getFederation();
                assert.equal(federationAddress, federation);
            });
        });

        describe('receiveTokens', async function () {
            it('receiveTokens approve and transferFrom for ERC20', async function () {
                const amount = web3.utils.toWei('1000');
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(this.token.address, anAccount, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                truffleAssert.eventEmitted(receipt, 'Cross', (ev) => {
                    return ev._tokenAddress === this.token.address
                    && ev._from === tokenOwner
                    && ev._to === anAccount
                    && ev._amount.toString() === amount
                    && ev._userData === null;
                });

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Max allowed tokens 18 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const amount = limit.max;
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Min allowed tokens 18 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const amount = await limit.min;
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Max allowed tokens 8 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const maxTokens = limit.max;
                const amount = new BN(maxTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, token.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, token.address);
                assert.equal(isKnownToken, true);
            });


            it('receiveTokens approve and transferFrom for ERC20 Min allowed tokens 8 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const minTokens = limit.min;
                const amount = new BN(minTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, token.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom Alternative ERC20 Detailed', async function () {
                const amount = web3.utils.toWei('1000', 'gwei'); // In GWei cause it gas 10 decimals
                const decimals = '10';
                const symbol = "ERC20";
                let erc20Alternative = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa(symbol), decimals, amount, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc20Alternative.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                let receipt = await erc20Alternative.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(erc20Alternative.address, anAccount, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                truffleAssert.eventEmitted(receipt, 'Cross', (ev) => {
                    return ev._tokenAddress === erc20Alternative.address
                    && ev._from === tokenOwner
                    && ev._to === anAccount
                    && ev._amount.toString() === amount
                    && ev._userData === null;
                });

                const tokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc20Alternative.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc20Alternative.address);
                assert.equal(isKnownToken, true);
            });

            it('depositTo using network currency', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });
                const decimals = (await wrbtc.decimals()).toString();
                const symbol = await wrbtc.symbol();

                await this.bridge.setWrappedCurrency(wrbtc.address, { from: bridgeManager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, wrbtc.address, this.typeId, { from: bridgeManager });

                receipt = await this.bridge.depositTo(anAccount, { from: tokenOwner, value: amount });
                utils.checkRcpt(receipt);

                truffleAssert.eventEmitted(receipt, 'Cross', (ev) => {
                    return ev._tokenAddress === wrbtc.address
                    && ev._from === tokenOwner
                    && ev._to === anAccount
                    && ev._amount.toString() === amount
                    && ev._userData === null;
                });

                const bridgeBalance = await wrbtc.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, wrbtc.address);
                assert.equal(isKnownToken, true);
            });

            it('fail depositTo no wrapped currency set', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, wrbtc.address, this.typeId, { from: bridgeManager });
                await utils.expectThrow(this.bridge.depositTo(anAccount, { from: tokenOwner, value: amount }));
            });

            it('call depositTo from a contract', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });
                const mockContract = await mockReceiveTokensCall.new(this.bridge.address)
                await this.bridge.setWrappedCurrency(wrbtc.address, { from: bridgeManager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, wrbtc.address, this.typeId, { from: bridgeManager });
                receipt = await mockContract.callDepositTo(anAccount, { from: tokenOwner, value: amount });
                utils.checkRcpt(receipt);

                const bridgeBalance = await wrbtc.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, wrbtc.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '1000';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });

                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let receipt = await erc777.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(erc777.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                truffleAssert.eventEmitted(receipt, 'Cross', (ev) => {
                    return ev._tokenAddress === erc777.address
                    && ev._from === tokenOwner
                    && ev._to === tokenOwner
                    && ev._amount.toString() === amount
                    && ev._userData === null;
                });

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId.toString(), { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = anAccount.toLowerCase();
                const result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,bytes,uint256)');
                assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
                      "type": "address"
                    },
                    {
                        "indexed": true,
                        "name": "_from",
                        "type": "address"
                      },
                    {
                      "indexed": true,
                      "name": "_to",
                      "type": "address"
                    },
                    {
                      "indexed": false,
                      "name": "_amount",
                      "type": "uint256"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, anAccount);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._userData, userData);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777 called with contract', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                const erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId.toString(), { from: bridgeManager });
                const mockContract = await mockReceiveTokensCall.new(this.bridge.address);
                await erc777.mint(mockContract.address, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(mockContract.address);
                const userData = anAccount.toLowerCase();
                const result = await mockContract.callTokensReceived(erc777.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,bytes,uint256)');
                assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
                      "type": "address"
                    },
                    {
                        "indexed": true,
                        "name": "_from",
                        "type": "address"
                      },
                    {
                      "indexed": true,
                      "name": "_to",
                      "type": "address"
                    },
                    {
                      "indexed": false,
                      "name": "_amount",
                      "type": "uint256"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, mockContract.address);
                assert.equal(decodedLog._to, anAccount);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._userData, userData);

                const tokenBalance = await erc777.balanceOf(mockContract.address);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777 user without address in data', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", { from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x';
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,bytes,uint256)');
                assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
                      "type": "address"
                    },
                    {
                        "indexed": true,
                        "name": "_from",
                        "type": "address"
                    },
                    {
                      "indexed": true,
                      "name": "_to",
                      "type": "address"
                    },
                    {
                      "indexed": false,
                      "name": "_amount",
                      "type": "uint256"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._userData, null);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777 with payment', async function () {
                const amount = new BN(web3.utils.toWei('1000'));
                const payment = new BN('185'); //1.85%
                await this.bridge.setFeePercentage(payment, { from: bridgeManager});
                const feePercentageDivider = await this.bridge.feePercentageDivider();
                const fees = amount.mul(payment).div(feePercentageDivider);
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = tokenOwner.toLowerCase();
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,bytes,uint256)');
                assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
                      "type": "address"
                    },
                    {
                        "indexed": true,
                        "name": "_from",
                        "type": "address"
                      },
                    {
                      "indexed": true,
                      "name": "_to",
                      "type": "address"
                    },
                    {
                      "indexed": false,
                      "name": "_amount",
                      "type": "uint256"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount.sub(fees).toString());
                assert.equal(decodedLog._userData, userData);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amount).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.sub(fees).toString());
                const ownerBalance = await erc777.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.toString());
                assert.equal(fees.toString(), (amount*1.85/100).toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived should fail if not a token contract', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(tokenOwner,tokenOwner, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if not directed to bridge', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, erc777.address, tokenOwner, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if calling from contract not whitelisted', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, this.allowTokens.address, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if calling from contract with no data', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                let userData = "0x";
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, erc777.address, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });


            it('send money to contract should fail', async function () {
                const payment = new BN('1000');
                await utils.expectThrow(web3.eth.sendTransaction({ from:tokenOwner, to: this.bridge.address, value: payment }));
            });

            it('receiveTokens with payment successful', async function () {
                const payment = new BN('33');
                const amount = new BN(web3.utils.toWei('1000'));
                const feePercentageDivider = await this.bridge.feePercentageDivider();
                const fees = amount.mul(payment).div(feePercentageDivider);
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                await this.bridge.setFeePercentage(payment, { from: bridgeManager});
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });

                let receipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const ownerBalance = await this.token.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.toString());
                assert.equal(fees.toString(), (amount*0.33/100).toString());
                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amount));
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.sub(fees).toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens with payment and granularity successful', async function () {
                const payment = new BN('33');
                const amount = new BN(web3.utils.toWei('1000'));
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const feePercentageDivider = await this.bridge.feePercentageDivider();
                const fees = amount.mul(payment).div(feePercentageDivider);
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                await this.bridge.setFeePercentage(payment, { from: bridgeManager});
                await erc777.approve(this.bridge.address, amount, { from: tokenOwner });

                let receipt = await this.bridge.receiveTokensTo(erc777.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const ownerBalance = await erc777.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.toString());
                assert.equal(fees.toString(), (amount*0.33/100).toString());
                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amount));
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.sub(fees).toString());
                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens should reject token not allowed', async function () {
                let newToken = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
                const amount = web3.utils.toWei('1000');
                await newToken.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokensTo(newToken.address, tokenOwner, amount, { from: tokenOwner }));
            });

            it('receiveTokens should work calling from a contract', async function () {
                let otherContract = await mockReceiveTokensCall.new(this.bridge.address);
                const amount = web3.utils.toWei('1000');
                await this.token.transfer(otherContract.address, amount, { from: tokenOwner });
                await otherContract.callReceiveTokens(this.token.address, tokenOwner, amount);
            });

            it('rejects to receive tokens greater than  max tokens allowed 18 decimals', async function() {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let amount = maxTokensAllowed.add(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens greater than  max tokens allowed 8 decimals', async function() {
                let newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let amount = maxTokensAllowed.div(new BN((10**10).toString()).add(new BN('1')));
                await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokensTo(newToken.address, tokenOwner, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, newToken.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await newToken.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens lesser than  min tokens allowed 18 decimals', async function() {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let minTokensAllowed = limit.min;
                let amount = minTokensAllowed.sub(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens greater than  min tokens allowed 8 decimals', async function() {
                let newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let amount = maxTokensAllowed.div(new BN((10**10).toString()).sub(new BN('1')));
                await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokensTo(newToken.address, tokenOwner, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownToken(chains.HARDHAT_TEST_NET_CHAIN_ID, newToken.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await newToken.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens over the daily limit 18 decimals', async function() {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let dailyLimit = limit.daily;

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokensTo(this.token.address, tokenOwner, maxTokensAllowed, { from: tokenOwner })
                }
                await utils.expectThrow(this.bridge.receiveTokensTo(this.token.address, tokenOwner, maxTokensAllowed, { from: tokenOwner}));
            });

            it('rejects to receive tokens over the daily limit 8 decimals', async function() {
                const newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, newToken.address, this.typeId, { from: bridgeManager });
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const maxTokensAllowed = limit.max;
                const amount = BigInt(maxTokensAllowed) / BigInt(10**10);
                const dailyLimit = limit.daily;

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });
                    await this.bridge.receiveTokensTo(newToken.address, tokenOwner, amount.toString(), { from: tokenOwner })
                }
                await utils.expectThrow(this.bridge.receiveTokensTo(newToken.address, tokenOwner, amount.toString(), { from: tokenOwner}));
            });

            it('clear spent today after 24 hours', async function() {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let dailyLimit = limit.daily;
                let maxWidthdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(maxWidthdraw.toString(), maxTokensAllowed.toString());

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokensTo(this.token.address, tokenOwner, maxTokensAllowed, { from: tokenOwner })
                }
                maxWidthdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(maxWidthdraw.toString(), '0');
                await utils.increaseTimestamp(web3, ONE_DAY+1);
                maxWidthdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(maxWidthdraw.toString(), maxTokensAllowed.toString());
            });

            it('clear spent today and successfully receives tokens', async function() {
                const amount = web3.utils.toWei('1000');
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let maxTokensAllowed = limit.max;
                let dailyLimit = limit.daily;

                for(let tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokensTo(this.token.address, tokenOwner, maxTokensAllowed, { from: tokenOwner })
                }
                await utils.increaseTimestamp(web3, ONE_DAY + 1);

                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                let receipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner});
                utils.checkRcpt(receipt);
            });

        });

    });

    describe('Mirror Side', async function () {
        beforeEach(async function () {
            // Set wrapped currency for main bridge
            this.wrbtc = await WRBTC.new({ from: tokenOwner });
            await this.bridge.setWrappedCurrency(this.wrbtc.address, { from: bridgeManager });
            await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.wrbtc.address, this.typeId, { from: bridgeManager });
            // Deploy Mirror Bridge and necesary contracts
            this.mirrorAllowTokens = await AllowTokens.new();
            await this.mirrorAllowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                bridgeManager,
                bridgeOwner,
                '0',
                '0',
                '0',
                [{
                    description: 'eMAIN',
                    limits:{
                        max:toWei('10000'),
                        min:toWei('1'),
                        daily:toWei('100000'),
                        mediumAmount:toWei('2'),
                        largeAmount:toWei('3')
                    }
                }]
            );
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();
            await this.mirrorBridge.methods['initialize(address,address,address,address,string)'](bridgeManager,
                federation, this.mirrorAllowTokens.address, this.mirrorSideTokenFactory.address, 'r', { from: bridgeOwner });
            await this.mirrorSideTokenFactory.transferPrimary(this.mirrorBridge.address);
            await this.mirrorAllowTokens.transferPrimary(this.mirrorBridge.address);
            // Set mirror wrapped currency
            this.mirrorWrbtc = await WRBTC.new({ from: tokenOwner });
            await this.mirrorBridge.setWrappedCurrency(this.mirrorWrbtc.address, { from: bridgeManager });
            await this.mirrorAllowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.mirrorWrbtc.address, this.typeId, { from: bridgeManager });
            //Cross a token
            this.amount = web3.utils.toWei('1000');
            this.decimals = (await this.token.decimals()).toString();
            this.granularity = 1;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, this.amount, { from: tokenOwner });

            await this.mirrorBridge.createSideToken(
                0,
                this.token.address,
                18,
                tokenSymbol,
                tokenName,
                chains.HARDHAT_TEST_NET_CHAIN_ID,
                { from: bridgeManager }
            );

            await this.mirrorBridge.createSideToken(
                0,
                this.wrbtc.address,
                18,
                'WRBTC',
                'Wrapped RBTC',
                chains.HARDHAT_TEST_NET_CHAIN_ID,
                { from: bridgeManager }
            );

            //Cross wrapped token to test unwrap when crossing back
            this.wrbtcAmount = web3.utils.toWei('2');
            this.txReceiptWrbtc = await this.bridge.depositTo(tokenOwner, { from: tokenOwner, value: this.wrbtcAmount });
        });

        describe('Cross the tokens', async function() {
            describe('acceptTransfer', async function() {
                it('accept transfer first time for the token', async function () {
                    const transactionDataHash =  await this.mirrorBridge.getTransactionDataHash(
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                    )
                    const receipt = await this.mirrorBridge.acceptTransfer(
                        this.token.address,
                        tokenOwner,
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: federation }
                    );
                    utils.checkRcpt(receipt);

                    const obtainedTransactionDataHash = await this.mirrorBridge.transactionsDataHashes(this.txReceipt.tx);
                    assert.equal(obtainedTransactionDataHash, transactionDataHash);

                    const originalTokenAddresses = await this.mirrorBridge.originalTokenAddresses(this.txReceipt.tx);
                    assert.equal(originalTokenAddresses, this.token.address);

                    const senderAddresses = await this.mirrorBridge.senderAddresses(this.txReceipt.tx);
                    assert.equal(senderAddresses, tokenOwner);

                });

                it('fail accept transfer with receiver empty address', async function () {
                    let decimals = 18;
                    let tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                    await this.mirrorBridge.createSideToken(
                        this.typeId,
                        tokenWithDecimals.address,
                        decimals,
                        "MAIN",
                        "MAIN",
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: bridgeManager }
                    );

                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, utils.NULL_ADDRESS, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation })
                    );
                });


                it('accept transfer only federation', async function () {
                    await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: bridgeOwner }));

                    await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager }));

                    const anAccountBalance = await this.token.balanceOf(anAccount);
                    assert.equal(anAccountBalance, 0);

                    const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(newBridgeBalance, this.amount);
                });

                it('should fail accept transfer the same transaction', async function () {
                    await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                    const hasCrossed = await this.mirrorBridge.hasCrossed(this.txReceipt.tx);
                    assert.equal(hasCrossed, true);

                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));

                });

                it('should fail accept transfer  null token address', async function () {
                    await utils.expectThrow(this.mirrorBridge.acceptTransfer("0x", anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));

                });

                it('should fail null receiver address', async function () {
                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, 0, this.amount,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));

                });

                it('should fail zero amount', async function () {
                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, 0,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));

                });

                it('should fail null blockhash', async function () {
                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        "0x", this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));
                });

                it('should fail null transaction hash', async function () {
                    await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount,
                        this.txReceipt.receipt.blockHash, "0x",
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation }));
                });
            });

            describe('claim', async function() {
                beforeEach(async function() {
                    await this.mirrorBridge.acceptTransfer(
                        this.token.address,
                        tokenOwner,
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: federation }
                    );
                });

                it('should claim token transfer', async function() {
                    let hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, false);

                    const transactionDataHash = await this.mirrorBridge.getTransactionDataHash(
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID
                    );

                    const obtainedTransactionDataHash = await this.mirrorBridge.transactionsDataHashes(this.txReceipt.tx);
                    assert.equal(obtainedTransactionDataHash, transactionDataHash);

                    const receipt = await this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: federation }
                    );
                    utils.checkRcpt(receipt);

                    hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, true);

                    const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                    const sideToken = await SideToken.at(sideTokenAddress);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
                    const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance, this.amount);
                });

                it('should claim fallback', async function() {
                    let hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, false);

                    const transactionDataHash = await this.mirrorBridge.getTransactionDataHash(
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID
                    );

                    const obtainedTransactionDataHash = await this.mirrorBridge.transactionsDataHashes(this.txReceipt.tx);
                    assert.equal(obtainedTransactionDataHash, transactionDataHash);

                    const receipt = await this.mirrorBridge.claimFallback(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: tokenOwner }
                    );
                    utils.checkRcpt(receipt);

                    hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, true);

                    const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                    const sideToken = await SideToken.at(sideTokenAddress);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
                    const mirrorToBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorToBalance, 0);
                    const mirrorSenderBalance = await sideToken.balanceOf(tokenOwner);
                    assert.equal(mirrorSenderBalance, this.amount);
                });

                it('fail if claimFallback with incorrect claimFallback', async function() {
                    utils.expectThrow(
                            this.mirrorBridge.claimFallback(
                            {
                                to: anAccount,
                                amount: this.amount,
                                blockHash: this.txReceipt.receipt.blockHash,
                                transactionHash: this.txReceipt.tx,
                                logIndex: this.txReceipt.receipt.logs[0].logIndex
                            },
                            { from: bridgeManager }
                        )
                    );
                });


                it('fail if claim with incorrect account', async function() {
                    utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: bridgeOwner,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: federation }
                    ));
                });

                it('fail if claim with incorrect amount', async function() {
                    utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: '1',
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: federation }
                    ));
                });

                it('fail if claim with incorrect blockhash', async function() {
                    utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: utils.getRandomHash(),
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: federation }
                    ));
                });

                it('fail if claim with incorrect transactionHash', async function() {
                    utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: utils.getRandomHash(),
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: federation }
                    ));
                });

                it('fail if claim with incorrect logIndex', async function() {
                    utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: '11'
                        },
                        { from: federation }
                    ));
                });

                it('fail if claim same transaction twice', async function () {
                    let hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, false);

                    const transactionDataHash = await this.mirrorBridge.getTransactionDataHash(
                        anAccount,
                        this.amount,
                        this.txReceipt.receipt.blockHash,
                        this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID
                    );

                    const obtainedTransactionDataHash = await this.mirrorBridge.transactionsDataHashes(this.txReceipt.tx);
                    assert.equal(obtainedTransactionDataHash, transactionDataHash);

                    receipt = await this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    );
                    utils.checkRcpt(receipt);

                    hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, true);

                    const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                    const sideToken = await SideToken.at(sideTokenAddress);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
                    const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance, this.amount);

                    await utils.expectThrow(this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    ));
                });

                it('should claim with decimals other than 18', async function () {
                    const decimals = 6;
                    const tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                    const txReceipt = await this.mirrorBridge.createSideToken(this.typeId, tokenWithDecimals.address, decimals, "MAIN", "MAIN", chains.HARDHAT_TEST_NET_CHAIN_ID, { from: bridgeManager });

                    let receipt = await this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, anAccount, this.amount,
                        txReceipt.receipt.blockHash, txReceipt.tx,
                        txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                    utils.checkRcpt(receipt);

                    receipt = await this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: txReceipt.receipt.blockHash,
                            transactionHash: txReceipt.tx,
                            logIndex: txReceipt.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    );
                    utils.checkRcpt(receipt);

                    let sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, tokenWithDecimals.address);
                    let sideToken = await SideToken.at(sideTokenAddress);
                    const sideTokenSymbol = await sideToken.symbol();
                    assert.equal(sideTokenSymbol, "rMAIN");

                    let originalTokenAddress = await this.mirrorBridge.originalTokenAddressBySideTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, sideTokenAddress);
                    assert.equal(originalTokenAddress, tokenWithDecimals.address);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
                    const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    let expectedAmount = new BN(this.amount.toString());
                    expectedAmount = expectedAmount.mul(new BN(10).pow(new BN(18-decimals)));
                    assert.equal(mirrorAnAccountBalance.toString(), expectedAmount.toString());
                });

                it('should claim first time from ERC777 with granularity', async function () {
                    const granularity = '100';
                    const tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, granularity, { from: tokenOwner });
                    tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                    const txReceipt = await this.mirrorBridge.createSideToken(this.typeId, tokenWithGranularity.address, 18, "MAIN", "MAIN", chains.HARDHAT_TEST_NET_CHAIN_ID, { from: bridgeManager });

                    let receipt = await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount,
                        txReceipt.receipt.blockHash, txReceipt.tx,
                        txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                    utils.checkRcpt(receipt);

                    receipt = await this.mirrorBridge.claim(
                        {
                            to: anAccount,
                            amount: this.amount,
                            blockHash: txReceipt.receipt.blockHash,
                            transactionHash: txReceipt.tx,
                            logIndex: txReceipt.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    );
                    utils.checkRcpt(receipt);

                    let sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, tokenWithGranularity.address);
                    let sideToken = await SideToken.at(sideTokenAddress);
                    const sideTokenSymbol = await sideToken.symbol();
                    assert.equal(sideTokenSymbol, "rMAIN");

                    let originalTokenAddress = await this.mirrorBridge.originalTokenAddressBySideTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, sideTokenAddress);
                    assert.equal(originalTokenAddress, tokenWithGranularity.address);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
                    const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());
                });

            });

            describe('claim gasless', async function() {
                beforeEach(async function() {
                    this.accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
                    this.gaslessAmount = '1001';
                    this.gaslessBlockHash = utils.getRandomHash();
                    this.gaslessTxHash = utils.getRandomHash();
                    this.gaslessLogIndex = '0';

                    await this.mirrorBridge.acceptTransfer(
                        this.token.address,
                        tokenOwner,
                        this.accountWallet.address,
                        this.gaslessAmount,
                        this.gaslessBlockHash,
                        this.gaslessTxHash,
                        this.gaslessLogIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: federation }
                    );
                });

                it('should have CLAIM_TYPEHASH', async function() {
                    const expectedTypeHash = keccak256('Claim(address to,uint256 amount,bytes32 transactionHash,address relayer,uint256 fee,uint256 nonce,uint256 deadline)');
                    const CLAIM_TYPEHASH = await this.mirrorBridge.CLAIM_TYPEHASH();
                    assert.equal(CLAIM_TYPEHASH, expectedTypeHash);
                });

                it('should have domainSeparator', async function() {
                    // Bug ganache treast chainid opcode as 1 https://github.com/trufflesuite/ganache-core/issues/451
                    const chainId = await web3.eth.getChainId();

                    const expectedTypeHash = keccak256(
                        web3.eth.abi.encodeParameters(
                            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
                            [
                              keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                              keccak256('RSK Token Bridge'),
                              keccak256('1'),
                              chainId,
                              this.mirrorBridge.address
                            ]
                        )
                    )
                    const DOMAIN_SEPARATOR = await this.mirrorBridge.domainSeparator();
                    assert.equal(DOMAIN_SEPARATOR, expectedTypeHash);
                });

                it('should claim gasless', async function() {
                    let hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.gaslessTxHash);
                    assert.equal(hasBeenClaimed, false);

                    const transactionDataHash = await this.mirrorBridge.getTransactionDataHash(
                        this.accountWallet.address,
                        this.gaslessAmount,
                        this.gaslessBlockHash,
                        this.gaslessTxHash,
                        this.gaslessLogIndex,
                        chains.HARDHAT_TEST_NET_CHAIN_ID
                    );

                    const obtainedTransactionDataHash = await this.mirrorBridge.transactionsDataHashes(this.gaslessTxHash);
                    assert.equal(obtainedTransactionDataHash, transactionDataHash);

                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: relayer,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    const receipt = await this.mirrorBridge.claimGasless(
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            blockHash: this.gaslessBlockHash,
                            transactionHash: this.gaslessTxHash,
                            logIndex: this.gaslessLogIndex
                        },
                        relayer,
                        fee,
                        deadline,
                        v,
                        r,
                        s,
                        { from: tokenOwner }
                    );
                    utils.checkRcpt(receipt);

                    hasBeenClaimed = await this.mirrorBridge.hasBeenClaimed(this.gaslessTxHash);
                    assert.equal(hasBeenClaimed, true);

                    const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                    const sideToken = await SideToken.at(sideTokenAddress);

                    const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance.toString(), '0');
                    const mirrorToBalance = await sideToken.balanceOf(this.accountWallet.address);
                    assert.equal(mirrorToBalance.toString(), this.gaslessAmount - fee);
                    const mirrorRelayerBalance = await sideToken.balanceOf(relayer);
                    assert.equal(mirrorRelayerBalance.toString(), fee);
                    expect((await this.mirrorBridge.nonces(this.accountWallet.address)).toString()).to.eq('1');
                });

                it('fail claim gasless invalid signature', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            fee,
                            deadline,
                            v,
                            s,
                            r,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless incorrect to', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: anAccount,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            fee,
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless incorrect amount', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.amount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            fee,
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless incorrect fee', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            '100',
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless incorrect relayer', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            anAccount,
                            fee,
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless expired deadline', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = '1';

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            fee,
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

                it('fail claim gasless fee bigger than amount', async function() {
                    const relayer = federation;
                    const fee = this.gaslessAmount + 1;
                    const nonce = (await this.mirrorBridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    const digest = await getClaimDigest(
                        this.mirrorBridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.gaslessAmount,
                            transactionHash: this.gaslessTxHash,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    await utils.expectThrow(
                        this.mirrorBridge.claimGasless(
                            {
                                to: this.accountWallet.address,
                                amount: this.gaslessAmount,
                                blockHash: this.gaslessBlockHash,
                                transactionHash: this.gaslessTxHash,
                                logIndex: this.gaslessLogIndex
                            },
                            relayer,
                            fee,
                            deadline,
                            v,
                            r,
                            s,
                            { from: tokenOwner }
                        )
                    );
                });

            }); // end claim gasless

            it('crossback with amount lower than granularity', async function () {
                const granularity = '10000000000000000';
                const decimals = '2';
                const blockHash = utils.getRandomHash();
                const txHash = utils.getRandomHash();
                const logIndex = 1;

                const aToken = await MainToken.new(tokenName, tokenSymbol, decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });

                await this.mirrorBridge.createSideToken(this.typeId, aToken.address, decimals, tokenSymbol, tokenName, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: bridgeManager });

                await this.mirrorBridge.acceptTransfer(aToken.address, anAccount, anAccount, this.amount,
                    blockHash, txHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                await this.mirrorBridge.claim(
                    {
                        to: anAccount,
                        amount: this.amount,
                        blockHash: blockHash,
                        transactionHash: txHash,
                        logIndex: logIndex
                    },
                    { from: anAccount }
                );

                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN('33');

                const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, aToken.address);
                const sideToken = await SideToken.at(sideTokenAddress);
                const feePercentageDivider = await this.mirrorBridge.feePercentageDivider();
                const fees = amountToCrossBack.mul(payment).div(feePercentageDivider);
                const modulo = amountToCrossBack.sub(fees).mod(new BN(granularity));

                const originalTokenBalance = await sideToken.balanceOf(anAccount);
                await this.mirrorBridge.setFeePercentage(payment, { from: bridgeManager});
                await sideToken.approve(this.mirrorBridge.address, amountToCrossBack, { from: anAccount });

                let receipt = await this.mirrorBridge.receiveTokensTo(sideToken.address, anAccount, amountToCrossBack, { from: anAccount });
                utils.checkRcpt(receipt);

                const ownerBalance = await sideToken.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.add(modulo).toString());
                assert.equal(fees.toString(), (amountToCrossBack*0.33/100).toString());
                const tokenBalance = await sideToken.balanceOf(anAccount);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amountToCrossBack));
                const bridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(bridgeBalance.toString(), '0');
            });

            it('crossback with amount lower than granularity and no fees', async function () {
                const granularity = '10000000000000000';
                const decimals = '2';
                const blockHash = utils.getRandomHash();
                const txHash = utils.getRandomHash();
                const logIndex = 1;

                const aToken = await MainToken.new(tokenName, tokenSymbol, decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });

                await this.mirrorBridge.createSideToken(this.typeId, aToken.address, decimals, "MAIN", "MAIN", chains.HARDHAT_TEST_NET_CHAIN_ID, { from: bridgeManager });

                await this.mirrorBridge.acceptTransfer(aToken.address, anAccount, anAccount, this.amount,
                    blockHash, txHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                await this.mirrorBridge.claim(
                    {
                        to: anAccount,
                        amount: this.amount,
                        blockHash: blockHash,
                        transactionHash: txHash,
                        logIndex: logIndex
                    },
                    { from: anAccount }
                );

                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN(0);

                const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, aToken.address);
                const sideToken = await SideToken.at(sideTokenAddress);
                const feePercentageDivider = await this.mirrorBridge.feePercentageDivider();
                const fees = amountToCrossBack.mul(payment).div(feePercentageDivider);
                const modulo = amountToCrossBack.sub(fees).mod(new BN(granularity));
                const originalTokenBalance = await sideToken.balanceOf(anAccount);

                await this.mirrorBridge.setFeePercentage(payment, { from: bridgeManager});
                await sideToken.approve(this.mirrorBridge.address, amountToCrossBack, { from: anAccount });

                let receipt = await this.mirrorBridge.receiveTokensTo(sideToken.address, anAccount, amountToCrossBack, { from: anAccount });
                utils.checkRcpt(receipt);

                const ownerBalance = await sideToken.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.add(modulo).toString());
                const tokenBalance = await sideToken.balanceOf(anAccount);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amountToCrossBack));
                const bridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(bridgeBalance.toString(), '0');
            });

            it('crossback wrapped network currency', async function () {
                const granularity = '1';
                const blockHash = utils.getRandomHash();
                const txHash = utils.getRandomHash();
                const logIndex = 1;

                await this.mirrorBridge.acceptTransfer(this.wrbtc.address, anAccount, anAccount, this.amount,
                    blockHash, txHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                await this.mirrorBridge.claim(
                    {
                        to: anAccount,
                        amount: this.amount,
                        blockHash: blockHash,
                        transactionHash: txHash,
                        logIndex: logIndex
                    },
                    { from: anAccount }
                );

                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN(0);

                const sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.wrbtc.address);
                const sideToken = await SideToken.at(sideTokenAddress);
                const feePercentageDivider = await this.mirrorBridge.feePercentageDivider();
                const fees = amountToCrossBack.mul(payment).div(feePercentageDivider);
                const modulo = amountToCrossBack.sub(fees).mod(new BN(granularity));
                const originalTokenBalance = await sideToken.balanceOf(anAccount);

                await this.mirrorBridge.setFeePercentage(payment, { from: bridgeManager});
                await sideToken.approve(this.mirrorBridge.address, amountToCrossBack, { from: anAccount });

                let receipt = await this.mirrorBridge.receiveTokensTo(sideToken.address, anAccount, amountToCrossBack, { from: anAccount });
                utils.checkRcpt(receipt);

                const ownerBalance = await sideToken.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.add(modulo).toString());
                const tokenBalance = await sideToken.balanceOf(anAccount);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amountToCrossBack));
                const bridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(bridgeBalance.toString(), '0');
            });

        });

        describe('Cross back the tokens', async function () {
            beforeEach(async function () {
                // Transfer to Side  Token
                await this.mirrorBridge.acceptTransfer(this.token.address, tokenOwner, anAccount, this.amount,
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                this.amountToCrossBack = web3.utils.toWei('100');
                this.decimals = (await this.token.decimals()).toString();
                this.granularity = 1;
                this.sideTokenAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);

                await this.mirrorBridge.claim(
                    {
                        to: anAccount,
                        amount: this.amount,
                        blockHash: this.txReceipt.receipt.blockHash,
                        transactionHash: this.txReceipt.tx,
                        logIndex: this.txReceipt.receipt.logs[0].logIndex
                    },
                    { from: anAccount }
                );

                //Transfer Side WRBTC
                await this.mirrorBridge.acceptTransfer(this.wrbtc.address, tokenOwner, anAccount, this.wrbtcAmount,
                    this.txReceiptWrbtc.receipt.blockHash, this.txReceiptWrbtc.tx,
                    this.txReceiptWrbtc.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                await this.mirrorBridge.claim(
                    {
                        to: anAccount,
                        amount: this.wrbtcAmount,
                        blockHash: this.txReceiptWrbtc.receipt.blockHash,
                        transactionHash: this.txReceiptWrbtc.tx,
                        logIndex: this.txReceiptWrbtc.receipt.logs[0].logIndex
                    },
                    { from: anAccount }
                );

                this.wrbtcAmountToCrossBack = web3.utils.toWei('1');
                this.sideWrbtcAddress = await this.mirrorBridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.wrbtc.address);
            });

            describe('Should burn the side tokens when transfered to the bridge', function () {
                it('using IERC20 approve and transferFrom', async function () {
                    let sideToken = await SideToken.at(this.sideTokenAddress);
                    let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    let receipt = await sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);
                    receipt = await this.mirrorBridge.receiveTokensTo(this.sideTokenAddress, tokenOwner, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);

                    mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), new BN(this.amount).sub( new BN(this.amountToCrossBack)).toString());

                    let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance.toString(), '0');
                });

                it('using ERC777 tokensReceived', async function () {
                    let sideToken = await SideToken.at(this.sideTokenAddress);
                    let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    let receipt = await sideToken.send(this.mirrorBridge.address, this.amountToCrossBack, tokenOwner, { from: anAccount });
                    utils.checkRcpt(receipt);

                    mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), new BN(this.amount).sub(new BN(this.amountToCrossBack)).toString());

                    let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance.toString(), '0');
                });

            });

            describe('After the mirror Bridge burned the tokens', function () {
                beforeEach(async function () {
                    this.accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    this.sideToken = await SideToken.at(this.sideTokenAddress);
                    await this.sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    await this.mirrorBridge.receiveTokensTo(this.sideTokenAddress, this.accountWallet.address, this.amountToCrossBack, { from: anAccount });

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    this.sideWrbtc = await SideToken.at(this.sideWrbtcAddress);
                    await this.sideWrbtc.approve(this.mirrorBridge.address, this.wrbtcAmountToCrossBack, { from: anAccount });
                    await this.mirrorBridge.receiveTokensTo(this.sideWrbtc.address, this.accountWallet.address, this.wrbtcAmountToCrossBack, { from: anAccount });
                });

                it('main Bridge should release the tokens', async function () {
                    let tx = await this.bridge.acceptTransfer(this.token.address, anAccount, this.accountWallet.address, this.amountToCrossBack,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                    utils.checkRcpt(tx);

                    await this.bridge.claim(
                        {
                            to: this.accountWallet.address,
                            amount: this.amountToCrossBack,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    );

                    let bridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(bridgeBalance, this.amount - this.amountToCrossBack);

                    let anAccountBalance = await this.token.balanceOf(this.accountWallet.address);
                    assert.equal(anAccountBalance, this.amountToCrossBack);
                });
                it('main Bridge should release the network currency', async function () {
                    let tx = await this.bridge.acceptTransfer(this.wrbtc.address, anAccount, this.accountWallet.address, this.wrbtcAmountToCrossBack,
                        this.txReceiptWrbtc.receipt.blockHash, this.txReceiptWrbtc.tx,
                        this.txReceiptWrbtc.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                    utils.checkRcpt(tx);

                    await this.bridge.claim(
                        {
                            to: this.accountWallet.address,
                            amount: this.wrbtcAmountToCrossBack,
                            blockHash: this.txReceiptWrbtc.receipt.blockHash,
                            transactionHash: this.txReceiptWrbtc.tx,
                            logIndex: this.txReceiptWrbtc.receipt.logs[0].logIndex
                        },
                        { from: anAccount }
                    );

                    const bridgeBalance = await this.wrbtc.balanceOf(this.bridge.address);
                    assert.equal(Number(bridgeBalance), Number(this.wrbtcAmount) - Number(this.wrbtcAmountToCrossBack));

                    const anAccountBalance = await web3.eth.getBalance(this.accountWallet.address);
                    assert.equal(anAccountBalance.toString(), this.wrbtcAmountToCrossBack);
                });

                it('should claim gasless crossing back', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.bridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    await this.bridge.acceptTransfer(this.token.address, anAccount, this.accountWallet.address, this.amountToCrossBack,
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                    const digest = await getClaimDigest(
                        this.bridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.amountToCrossBack,
                            transactionHash: this.txReceipt.tx,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    const receipt = await this.bridge.claimGasless(
                        {
                            to: this.accountWallet.address,
                            amount: this.amountToCrossBack,
                            blockHash: this.txReceipt.receipt.blockHash,
                            transactionHash: this.txReceipt.tx,
                            logIndex: this.txReceipt.receipt.logs[0].logIndex
                        },
                        relayer,
                        fee,
                        deadline,
                        v,
                        r,
                        s,
                        { from: anAccount }
                    );
                    utils.checkRcpt(receipt);

                    const hasBeenClaimed = await this.bridge.hasBeenClaimed(this.txReceipt.tx);
                    assert.equal(hasBeenClaimed, true);

                    const toBalance = await this.token.balanceOf(this.accountWallet.address);
                    assert.equal(toBalance.toString(), this.amountToCrossBack - fee);
                    const relayerBalance = await this.token.balanceOf(relayer);
                    assert.equal(relayerBalance.toString(), fee);
                    expect((await this.bridge.nonces(this.accountWallet.address)).toString()).to.eq('1');
                });
                it('should claim gasless network currency crossing back', async function() {
                    const relayer = federation;
                    const fee = '11';
                    const nonce = (await this.bridge.nonces(this.accountWallet.address)).toString();
                    const deadline = Number.MAX_SAFE_INTEGER.toString();

                    await this.bridge.acceptTransfer(this.wrbtc.address, anAccount, this.accountWallet.address, this.wrbtcAmountToCrossBack,
                        this.txReceiptWrbtc.receipt.blockHash, this.txReceiptWrbtc.tx,
                        this.txReceiptWrbtc.receipt.logs[0].logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });

                    const digest = await getClaimDigest(
                        this.bridge,
                        {
                            to: this.accountWallet.address,
                            amount: this.wrbtcAmountToCrossBack,
                            transactionHash: this.txReceiptWrbtc.tx,
                            relayer: federation,
                            fee: fee
                        },
                        nonce,
                        deadline
                      );

                    const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(this.accountWallet.privateKey.slice(2), 'hex'));

                    const originalToBalance = await web3.eth.getBalance(this.accountWallet.address);
                    const originalRelayerBalance = await web3.eth.getBalance(relayer);

                    const receipt = await this.bridge.claimGasless(
                        {
                            to: this.accountWallet.address,
                            amount: this.wrbtcAmountToCrossBack,
                            blockHash: this.txReceiptWrbtc.receipt.blockHash,
                            transactionHash: this.txReceiptWrbtc.tx,
                            logIndex: this.txReceiptWrbtc.receipt.logs[0].logIndex
                        },
                        relayer,
                        fee,
                        deadline,
                        v,
                        r,
                        s,
                        { from: anAccount }
                    );
                    utils.checkRcpt(receipt);

                    const hasBeenClaimed = await this.bridge.hasBeenClaimed(this.txReceiptWrbtc.tx);
                    assert.equal(hasBeenClaimed, true);

                    const toBalance = await web3.eth.getBalance(this.accountWallet.address);
                    assert.equal(new BN(originalToBalance).add(new BN(toBalance)).toString(), this.wrbtcAmountToCrossBack - fee);
                    const relayerBalance = await web3.eth.getBalance(relayer);
                    assert.equal(new BN(relayerBalance).sub(new BN(originalRelayerBalance)).toString(), fee);
                    expect((await this.bridge.nonces(this.accountWallet.address)).toString()).to.eq('1');
                });
            }); // After the mirror Bridge burned the tokens

        });

    });

    describe('Pausable methods', async function() {
        it('Should pause the bridge contract', async function() {
            let isPaused = await this.bridge.paused();
            assert.equal(isPaused, false);

            await this.bridge.pause({ from: bridgeManager });
            isPaused = await this.bridge.paused();
            assert.equal(isPaused, true);
        });

        it('Should not pause the bridge contract without pauser role', async function() {
            let isPaused = await this.bridge.paused();
            assert.equal(isPaused, false);

            await utils.expectThrow(this.bridge.pause());
            assert.equal(isPaused, false);
        });

        it('Should unpause the bridge contract', async function() {
            await this.bridge.pause({ from: bridgeManager });
            let isPaused = await this.bridge.paused();
            assert.equal(isPaused, true);

            await this.bridge.unpause({ from: bridgeManager });
            isPaused = await this.bridge.paused();
            assert.equal(isPaused, false);
        });

        it('Should not unpause the bridge contract without pauser role', async function() {
            await this.bridge.pause({ from: bridgeManager });
            let isPaused = await this.bridge.paused();
            assert.equal(isPaused, true);

            await utils.expectThrow(this.bridge.unpause());
            assert.equal(isPaused, true);
        });
    })

    describe('Ownable methods', async function() {
        const anotherOwner = accounts[7];

        it('Should renounce ownership', async function() {
            await this.bridge.renounceOwnership({ from: bridgeManager });
            let owner = await this.bridge.owner();
            assert.equal(BigInt(owner), 0);
        });

        it('Should not renounce ownership when not called by the owner', async function() {
            let owner = await this.bridge.owner();
            await utils.expectThrow(this.bridge.renounceOwnership());
            let ownerAfter = await this.bridge.owner();

            assert.equal(owner, ownerAfter);
        });

        it('Should transfer ownership', async function() {
            await this.bridge.transferOwnership(anotherOwner, { from: bridgeManager });
            let owner = await this.bridge.owner();
            assert.equal(owner, anotherOwner);
        });

        it('Should not transfer ownership when not called by the owner', async function() {
            let owner = await this.bridge.owner();
            await utils.expectThrow(this.bridge.transferOwnership(anotherOwner));
            let ownerAfter = await this.bridge.owner();

            assert.equal(owner, ownerAfter);
        });
    });

    describe('Upgrading methods', async function() {
        it('Should start upgrade the bridge contract', async function() {
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, false);

            await this.bridge.setUpgrading(true, { from: bridgeManager });
            isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);
        });

        it('Should not set upgrading of the bridge contract if not the owner', async function() {
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, false);

            await utils.expectThrow(this.bridge.setUpgrading(true));
            assert.equal(isUpgrading, false);
        });

        it('Should end upgrade of the bridge contract', async function() {
            await this.bridge.setUpgrading(true, { from: bridgeManager });
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);

            await this.bridge.setUpgrading(false, { from: bridgeManager });
            isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, false);
        });

        it('Should not end upgrade of the bridge contract if not the owner', async function() {
            await this.bridge.setUpgrading(true, { from: bridgeManager });
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);

            await utils.expectThrow(this.bridge.setUpgrading(false,));
            assert.equal(isUpgrading, true);
        });

        describe('when Upgrading', async function() {
            beforeEach(async function() {
                await this.bridge.setUpgrading(true, { from: bridgeManager });
            });

            it('should create side token', async function () {
                await this.bridge.createSideToken(
                    0,
                    this.token.address,
                    6,
                    'MAIN',
                    'MAIN',
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    { from: bridgeManager }
                );
                const sideTokenAddress = await this.bridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, 'eMAIN');

                const sideTokenDecimals = await sideToken.decimals();
                assert.equal(sideTokenDecimals.toString(), '18');

                const sideTokenGranularity = await sideToken.granularity();
                assert.equal(sideTokenGranularity.toString(), '1000000000000');

                const originalTokenAddress = await this.bridge.originalTokenAddressBySideTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, sideTokenAddress);
                assert.equal(result.info.typeId.toString(), '0');
                assert.equal(result.info.allowed, true);

            });

            it('fail create side token if decimals bigger than 18', async function () {
                await utils.expectThrow(
                    this.bridge.createSideToken(
                        0,
                        this.token.address,
                        19,
                        'MAIN',
                        'MAIN',
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: bridgeManager }
                    )
                );
            });

            it('fail create side token if inexistent typeId', async function () {
                await utils.expectThrow(
                    this.bridge.createSideToken(
                        1,
                        this.token.address,
                        18,
                        'MAIN',
                        'MAIN',
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: bridgeManager }
                    )
                );
            });

            it('fail create side token if not the owner', async function () {
                await utils.expectThrow(
                    this.bridge.createSideToken(
                        0,
                        this.token.address,
                        18,
                        'MAIN',
                        'MAIN',
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: federation }
                    )
                );
            });

            it('fail create side token if no token address', async function () {
                await utils.expectThrow(
                    this.bridge.createSideToken(
                        0,
                        utils.NULL_ADDRESS,
                        18,
                        'MAIN',
                        'MAIN',
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: bridgeManager }
                    )
                );
            });
            it('fail create side token if already created', async function () {
                await this.bridge.createSideToken(
                    0,
                    this.token.address,
                    18,
                    'MAIN',
                    'MAIN',
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    { from: bridgeManager }
                );
                await utils.expectThrow(
                    this.bridge.createSideToken(
                        0,
                        this.token.address,
                        18,
                        'MAIN',
                        'MAIN',
                        chains.HARDHAT_TEST_NET_CHAIN_ID,
                        { from: bridgeManager }
                    )
                );
            });

            it('should reject receiveTokens ERC20', async function () {
                const amount = web3.utils.toWei('1000');
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner }));
            });

            it('should reject tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                await utils.expectThrow(erc777.send(this.bridge.address, amount, tokenOwner, { from: tokenOwner }));
            });

            it('should accept transfer for the token', async function () {
                await this.bridge.createSideToken(
                    0,
                    this.token.address,
                    18,
                    'MAIN',
                    'MAIN',
                    chains.HARDHAT_TEST_NET_CHAIN_ID,
                    { from: bridgeManager }
                );

                const sideTokenAddress = await this.bridge.sideTokenAddressByOriginalTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                const originalTokenAddress = await this.bridge.originalTokenAddressBySideTokenAddress(chains.HARDHAT_TEST_NET_CHAIN_ID, sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const balanceBeforeTransfer = await sideToken.balanceOf(anAccount);
                const bridgeBalanceBeforeTransfer  = await sideToken.balanceOf(this.bridge.address);

                const amount = web3.utils.toWei('1000');
                const blockHash = utils.getRandomHash();
                const txHash = utils.getRandomHash();
                const logIndex = 1;

                const transactionDataHash =  await this.bridge.getTransactionDataHash(
                    anAccount,
                    amount,
                    blockHash,
                    txHash,
                    logIndex,
                    chains.HARDHAT_TEST_NET_CHAIN_ID
                )

                const receipt = await this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, amount,
                    blockHash, txHash, logIndex, chains.HARDHAT_TEST_NET_CHAIN_ID, { from: federation });
                utils.checkRcpt(receipt);


                const mirrorBridgeBalance = await sideToken.balanceOf(this.bridge.address);
                assert.equal(mirrorBridgeBalance.toString(), bridgeBalanceBeforeTransfer.toString());
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance.toString(), balanceBeforeTransfer.toString());

                const obtainedTransactionDataHash = await this.bridge.transactionsDataHashes(txHash);
                assert.equal(obtainedTransactionDataHash, transactionDataHash);

                const originalTokenAddresses = await this.bridge.originalTokenAddresses(txHash);
                assert.equal(originalTokenAddresses, this.token.address);

                const senderAddresses = await this.bridge.senderAddresses(txHash);
                assert.equal(senderAddresses, anAccount);
            });
        });
    });

    describe('change SideTokenFactory', async function() {

        it('should reject empty address', async function () {
            await utils.expectThrow(this.bridge.changeSideTokenFactory(utils.NULL_ADDRESS, { from: bridgeManager }));
        });

        it('should be successful', async function () {
            let newAddress = utils.getRandomAddress();
            await this.bridge.changeSideTokenFactory(newAddress, { from: bridgeManager });
            let result = await this.bridge.sideTokenFactory();
            assert.equal(result.toLowerCase(), newAddress.toLowerCase());
        });
    });

});

