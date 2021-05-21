const MainToken = artifacts.require('./MainToken');
const AlternativeERC20Detailed = artifacts.require('./AlternativeERC20Detailed');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');
const AllowTokens = artifacts.require('./AllowTokens');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const MultiSigWallet = artifacts.require('./MultiSigWallet');
const UtilsContract = artifacts.require('./Utils');
const mockReceiveTokensCall = artifacts.require('./mockReceiveTokensCall');
const WRBTC = artifacts.require('./WRBTC');

const utils = require('./utils');
const BN = web3.utils.BN;
const randomHex = web3.utils.randomHex;
const ONE_DAY = 24*3600;
const toWei = web3.utils.toWei;

contract('Bridge', async function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const federation = accounts[5];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
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
        await this.allowTokens.setToken(this.token.address, this.typeId, { from: bridgeManager });
        this.sideTokenFactory = await SideTokenFactory.new();
        this.utilsContract = await UtilsContract.deployed();
        await Bridge.link(UtilsContract, this.utilsContract.address);
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

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], this.token.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], anAccount);
                assert.equal(receipt.logs[0].args[3], amount);
                assert.equal(receipt.logs[0].args[4], await this.token.symbol());
                assert.equal(receipt.logs[0].args[5], null);
                assert.equal(receipt.logs[0].args[6].toString(), (await this.token.decimals()).toString());
                assert.equal(receipt.logs[0].args[7].toString(), '1');

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
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
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
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
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Max allowed tokens 8 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const maxTokens = limit.max;
                const amount = new BN(maxTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });

                await this.allowTokens.setToken(token.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(token.address);
                assert.equal(isKnownToken, true);
            });


            it('receiveTokens approve and transferFrom for ERC20 Min allowed tokens 8 decimals', async function () {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                const minTokens = limit.min;
                const amount = new BN(minTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });

                await this.allowTokens.setToken(token.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(token.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom Alternative ERC20 Detailed', async function () {
                const amount = web3.utils.toWei('1000', 'gwei'); // In GWei cause it gas 10 decimals
                const decimals = '10';
                const symbol = "ERC20";
                let erc20Alternative = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa(symbol), decimals, amount, { from: tokenOwner });

                await this.allowTokens.setToken(erc20Alternative.address, this.typeId, { from: bridgeManager });
                const originalTokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                let receipt = await erc20Alternative.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(erc20Alternative.address, anAccount, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], erc20Alternative.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], anAccount);
                assert.equal(receipt.logs[0].args[3], amount);
                assert.equal(receipt.logs[0].args[4], symbol);
                assert.equal(receipt.logs[0].args[5], null);
                assert.equal(receipt.logs[0].args[6].toString(), decimals);
                assert.equal(receipt.logs[0].args[7].toString(), '1');

                const tokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc20Alternative.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc20Alternative.address);
                assert.equal(isKnownToken, true);
            });

            it('depositTo using network currency', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });
                const decimals = (await wrbtc.decimals()).toString();
                const symbol = await wrbtc.symbol();

                await this.bridge.setWrappedCurrency(wrbtc.address, { from: bridgeManager });
                await this.allowTokens.setToken(wrbtc.address, this.typeId, { from: bridgeManager });

                receipt = await this.bridge.depositTo(anAccount, { from: tokenOwner, value: amount });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], wrbtc.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], anAccount);
                assert.equal(receipt.logs[0].args[3], amount);
                assert.equal(receipt.logs[0].args[4], symbol);
                assert.equal(receipt.logs[0].args[5], null);
                assert.equal(receipt.logs[0].args[6].toString(), decimals);
                assert.equal(receipt.logs[0].args[7].toString(), '1');

                const bridgeBalance = await wrbtc.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(wrbtc.address);
                assert.equal(isKnownToken, true);
            });

            it('fail depositTo no wrapped currency set', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });

                await this.allowTokens.setToken(wrbtc.address, this.typeId, { from: bridgeManager });
                await utils.expectThrow(this.bridge.depositTo(anAccount, { from: tokenOwner, value: amount }));
            });

            it('call depositTo from a contract', async function () {
                const amount = web3.utils.toWei('1');
                const wrbtc = await WRBTC.new({ from: tokenOwner });
                const mockContract = await mockReceiveTokensCall.new(this.bridge.address)
                await this.bridge.setWrappedCurrency(wrbtc.address, { from: bridgeManager });
                await this.allowTokens.setToken(wrbtc.address, this.typeId, { from: bridgeManager });
                receipt = await mockContract.callDepositTo(anAccount, { from: tokenOwner, value: amount });
                utils.checkRcpt(receipt);

                const bridgeBalance = await wrbtc.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(wrbtc.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '1000';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });

                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let receipt = await erc777.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokensTo(erc777.address, tokenOwner, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], erc777.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], tokenOwner);
                assert.equal(receipt.logs[0].args[3], amount);
                assert.equal(receipt.logs[0].args[4], await erc777.symbol());
                assert.equal(receipt.logs[0].args[5], null);
                assert.equal(receipt.logs[0].args[6].toString(), (await erc777.decimals()).toString());
                assert.equal(receipt.logs[0].args[7].toString(), granularity);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });
                await this.allowTokens.setToken(erc777.address, this.typeId.toString(), { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = anAccount.toLowerCase();
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,string,bytes,uint8,uint256,uint256)');
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
                      "name": "_symbol",
                      "type": "string"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    },
                    {
                      "indexed": false,
                      "name": "_decimals",
                      "type": "uint8"
                    },
                    {
                      "indexed": false,
                      "name": "_granularity",
                      "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "name": "_typeId",
                        "type": "uint256"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, anAccount);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, userData);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());
                assert.equal(decodedLog._typeId, this.typeId);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777 called with contract', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                const erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });
                await this.allowTokens.setToken(erc777.address, this.typeId.toString(), { from: bridgeManager });
                const mockContract = await mockReceiveTokensCall.new(this.bridge.address);
                await erc777.mint(mockContract.address, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(mockContract.address);
                const userData = anAccount.toLowerCase();
                const result = await mockContract.callTokensReceived(erc777.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                const eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,string,bytes,uint8,uint256,uint256)');
                assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
                const decodedLog = web3.eth.abi.decodeLog([
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
                      "name": "_symbol",
                      "type": "string"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    },
                    {
                      "indexed": false,
                      "name": "_decimals",
                      "type": "uint8"
                    },
                    {
                      "indexed": false,
                      "name": "_granularity",
                      "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "name": "_typeId",
                        "type": "uint256"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, mockContract.address);
                assert.equal(decodedLog._to, anAccount);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, userData);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());
                assert.equal(decodedLog._typeId, this.typeId);

                const tokenBalance = await erc777.balanceOf(mockContract.address);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777 user without address in data', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", { from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x';
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,string,bytes,uint8,uint256,uint256)');
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
                      "name": "_symbol",
                      "type": "string"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    },
                    {
                      "indexed": false,
                      "name": "_decimals",
                      "type": "uint8"
                    },
                    {
                      "indexed": false,
                      "name": "_granularity",
                      "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "name": "_typeId",
                        "type": "uint256"
                    }
                  ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[3].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, null);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());
                assert.equal(decodedLog._typeId, this.typeId);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
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

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = tokenOwner.toLowerCase();
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                const eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,address,uint256,string,bytes,uint8,uint256,uint256)');
                const eventRawLog = result.receipt.rawLogs[3];
                assert.equal(eventRawLog.topics[0], eventSignature);

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
                      "name": "_symbol",
                      "type": "string"
                    },
                    {
                      "indexed": false,
                      "name": "_userData",
                      "type": "bytes"
                    },
                    {
                      "indexed": false,
                      "name": "_decimals",
                      "type": "uint8"
                    },
                    {
                      "indexed": false,
                      "name": "_granularity",
                      "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "name": "_typeId",
                        "type": "uint256"
                      }
                  ], eventRawLog.data, eventRawLog.topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._from, tokenOwner);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount.sub(fees).toString());
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, userData);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());
                assert.equal(decodedLog._typeId, this.typeId);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), originalTokenBalance.sub(amount).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.sub(fees).toString());
                const ownerBalance = await erc777.balanceOf(bridgeManager);
                assert.equal(ownerBalance.toString(), fees.toString());
                assert.equal(fees.toString(), (amount*1.85/100).toString());
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived should fail if not a token contract', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(tokenOwner,tokenOwner, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if not directed to bridge', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, erc777.address, tokenOwner, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if calling from contract not whitelisted', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                let userData = tokenOwner;
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, this.allowTokens.address, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if calling from contract with no data', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
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
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens with payment and granularity successful', async function () {
                const payment = new BN('33');
                const amount = new BN(web3.utils.toWei('1000'));
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
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
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
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

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
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

                const isKnownToken = await this.bridge.knownTokens(newToken.address);
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

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
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

                const isKnownToken = await this.bridge.knownTokens(newToken.address);
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
                await this.allowTokens.setToken(newToken.address, this.typeId, { from: bridgeManager });
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
                let maxWidthdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
                assert.equal(maxWidthdraw.toString(), maxTokensAllowed.toString());

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokensTo(this.token.address, tokenOwner, maxTokensAllowed, { from: tokenOwner })
                }
                maxWidthdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
                assert.equal(maxWidthdraw.toString(), '0');
                await utils.increaseTimestamp(web3, ONE_DAY+1);
                maxWidthdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
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
            await this.allowTokens.setToken(this.wrbtc.address, this.typeId, { from: bridgeManager });
            // Deploy Mirror Bridge and necesary contracts
            this.mirrorAllowTokens = await AllowTokens.new();
            await this.mirrorAllowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                bridgeManager,
                bridgeOwner,
                '0',
                '0',
                '0',
                [{
                    description: 'eRIF',
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
            await this.mirrorAllowTokens.setToken(this.mirrorWrbtc.address, this.typeId, { from: bridgeManager });
            //Cross a token
            this.amount = web3.utils.toWei('1000');
            this.decimals = (await this.token.decimals()).toString();
            this.granularity = 1;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, this.amount, { from: tokenOwner });
            //Cross wrapped token to test unwrap when crossing back
            this.wrbtcAmount = web3.utils.toWei('2');
            await this.bridge.depositTo(tokenOwner, { from: tokenOwner, value: this.wrbtcAmount });
        });

        describe('Cross the tokens', async function () {
            it('accept transfer first time for the token', async function () {
                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");

                let originalTokenAddress = await this.mirrorBridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);
            });

            it('accept transfer second time for the token', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });

                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                randomHex(32), randomHex(32), 1, this.decimals, this.granularity, this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");

                let originalTokenAddress = await this.mirrorBridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount * 2);
            });

            it('accept transfer with decimals other than 18', async function () {
                let decimals = 6;
                let tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithDecimals.address, this.typeId, { from: bridgeManager });

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(tokenWithDecimals.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");

                let originalTokenAddress = await this.mirrorBridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, tokenWithDecimals.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                let expectedAmount = new BN(this.amount.toString());
                expectedAmount = expectedAmount.mul(new BN(10).pow(new BN(18-decimals)));
                assert.equal(mirrorAnAccountBalance.toString(), expectedAmount.toString());
            });

            it('fail accept transfer with decimals bigger than 18', async function () {
                let decimals = 19;
                let tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithDecimals.address, this.typeId, { from: bridgeManager });

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, this.typeId, { from: federation })
                );
            });

            it('fail accept transfer with receiver empty address', async function () {
                let decimals = 18;
                let tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithDecimals.address, this.typeId, { from: bridgeManager });

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, utils.NULL_ADDRESS, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, this.typeId, { from: federation })
                );
            });

            it('accept transfer first time from ERC777 with granularity', async function () {
                const granularity = '100';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, granularity, { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithGranularity.address, this.typeId, { from: bridgeManager });

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(tokenWithGranularity.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");

                const sideTokenGranularity = await sideToken.granularity();
                assert.equal(sideTokenGranularity.toString(), granularity);

                let originalTokenAddress = await this.mirrorBridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, tokenWithGranularity.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());
            });

            it('accept transfer second time from ERC777 with granularity', async function () {
                const granularity = '100';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, granularity, { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, new BN(this.amount).mul(new BN('2')).toString(), '0x', '0x', { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithGranularity.address, this.typeId, { from: bridgeManager });

                await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, this.typeId, { from: federation });

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    randomHex(32), randomHex(32), 1, this.decimals, granularity, this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(tokenWithGranularity.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");

                const sideTokenGranularity = await sideToken.granularity();
                assert.equal(sideTokenGranularity.toString(), granularity);

                let originalTokenAddress = await this.mirrorBridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, tokenWithGranularity.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance.toString(), new BN(this.amount).mul(new BN('2')).toString());
            });

            it('accept transfer from ERC777 with granularity not power of 10', async function () {
                const granularity = '20';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, '1', { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithGranularity.address, this.typeId, { from: bridgeManager });

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, this.typeId, { from: federation })
                );
            });

            it('accept transfer from ERC777 with granularity bigger than  10^18', async function () {
                const granularity = '10000000000000000000';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, '1', { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithGranularity.address, this.typeId, { from: bridgeManager });

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, this.typeId, { from: federation })
                    );
            });

            it('accept transfer from ERC777 with granularity less than 1', async function () {
                const granularity = '0';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, '1', { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.mirrorAllowTokens.setToken(tokenWithGranularity.address, this.typeId, { from: bridgeManager });

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, this.typeId, { from: federation })
                    );
            });

            it('accept transfer only federation', async function () {
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: bridgeOwner }));
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: bridgeManager }));

                const anAccountBalance = await this.token.balanceOf(anAccount);
                assert.equal(anAccountBalance, 0);

                const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(newBridgeBalance, this.amount);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(sideTokenAddress, 0);
            });

            it('dont accept transfer the same transaction', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));

            });

            it('should fail null token address', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer("0x", anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));

            });

            it('should fail null receiver address', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, 0, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));

            });

            it('should fail zero amount', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, 0, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));

            });

            it('should fail null symbol', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));

            });

            it('should fail null blockhash', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                "0x", this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation }));
            });

            it('should fail null transaction hash', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, "0x",
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));
            });

            it('should fail invalid decimals', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, '19', this.granularity, this.typeId, { from: federation }));
            });

            it('should fail granularity 0', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, new BN('0'), this.typeId, { from: federation }));
            });

            it('should fail more than max granularity', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, new BN('10000000000000000000'), this.typeId, { from: federation }));
            });

            it('should overflow granularity multiplication', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, web3.utils.toWei('100000000000000000000000000000000000000000000000000'), "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, 0, this.granularity, this.typeId, { from: federation }));
            });

            it('crossback with amount lower than granularity', async function () {
                const granularity = '10000000000000000';
                const decimals = 18;
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, granularity, this.typeId, { from: federation });
                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN('33');

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
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
                const decimals = 18;
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, granularity, this.typeId, { from: federation });
                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN(0);

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);;
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
                const decimals = '18';
                await this.mirrorBridge.acceptTransfer(this.wrbtc.address, anAccount, anAccount, this.amount, "WRBTC",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, granularity, this.typeId, { from: federation });
                const amountToCrossBack = new BN(web3.utils.toWei('1'));
                const payment = new BN(0);

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.wrbtc.address);
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
                await this.mirrorBridge.acceptTransfer(this.token.address, tokenOwner, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });
                this.amountToCrossBack = web3.utils.toWei('100');
                this.decimals = (await this.token.decimals()).toString();
                this.granularity = 1;
                this.sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                //Transfer Side WRBTC
                await this.mirrorBridge.acceptTransfer(this.wrbtc.address, tokenOwner, anAccount, this.wrbtcAmount, "WRBTC",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });
                this.wrbtcAmountToCrossBack = web3.utils.toWei('1');
                this.sideWrbtcAddress = await this.mirrorBridge.mappedTokens(this.wrbtc.address);
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
                    this.anEmptyAccount = randomHex(20);
                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    this.sideToken = await SideToken.at(this.sideTokenAddress);
                    await this.sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    await this.mirrorBridge.receiveTokensTo(this.sideTokenAddress, this.anEmptyAccount, this.amountToCrossBack, { from: anAccount });
                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    this.sideWrbtc = await SideToken.at(this.sideWrbtcAddress);
                    await this.sideWrbtc.approve(this.mirrorBridge.address, this.wrbtcAmountToCrossBack, { from: anAccount });
                    await this.mirrorBridge.receiveTokensTo(this.sideWrbtc.address, this.anEmptyAccount, this.wrbtcAmountToCrossBack, { from: anAccount });
                });

                it('main Bridge should release the tokens', async function () {
                    let tx = await this.bridge.acceptTransfer(this.token.address, anAccount, this.anEmptyAccount, this.amountToCrossBack, "MAIN",
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, this.typeId, { from: federation });
                    utils.checkRcpt(tx);

                    let bridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(bridgeBalance, this.amount - this.amountToCrossBack);

                    let anAccountBalance = await this.token.balanceOf(this.anEmptyAccount);
                    assert.equal(anAccountBalance, this.amountToCrossBack);
                });
                it('main Bridge should release the network currency', async function () {
                    let tx = await this.bridge.acceptTransfer(this.wrbtc.address, anAccount, this.anEmptyAccount, this.wrbtcAmountToCrossBack, "WRBTC",
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, '18', '1', this.typeId, { from: federation });
                    utils.checkRcpt(tx);

                    let bridgeBalance = await this.wrbtc.balanceOf(this.bridge.address);
                    assert.equal(Number(bridgeBalance), Number(this.wrbtcAmount) - Number(this.wrbtcAmountToCrossBack));

                    let anAccountBalance = await web3.eth.getBalance(this.anEmptyAccount);
                    assert.equal(anAccountBalance.toString(), this.wrbtcAmountToCrossBack);
                });
            });

        });

    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[7];
        const multiSigOnwerB = accounts[8];

        beforeEach(async function () {
            this.granularity = 1;
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.fedMultiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.allowTokens = await AllowTokens.new();
            await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                this.multiSig.address,
                bridgeOwner,
                '0',
                '0',
                '0',
                []
            );
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();
            this.decimals = "18";

            let data = this.mirrorBridge.contract.methods['initialize(address,address,address,address,string)'](
                this.multiSig.address,
                this.fedMultiSig.address,
                this.allowTokens.address,
                this.mirrorSideTokenFactory.address,
                'r'
            ).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex = 0;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            await this.mirrorSideTokenFactory.transferPrimary(this.mirrorBridge.address);
            await this.allowTokens.transferPrimary(this.mirrorBridge.address);

            data = this.allowTokens.contract.methods.addTokenType('MAIN', {max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            data = this.allowTokens.contract.methods.setToken(this.token.address, this.typeId).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            this.amount = web3.utils.toWei('1000');
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokensTo(this.token.address, tokenOwner, this.amount, { from: tokenOwner });
        });

        it('should not accept a transfer due to missing signatures', async function() {
            let data = this.mirrorBridge.contract.methods.acceptTransfer(
                this.token.address,
                anAccount,
                anAccount,
                this.amount,
                'MAIN',
                this.txReceipt.receipt.blockHash,
                this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex,
                this.decimals,
                this.granularity,
                this.typeId
            ).encodeABI();
            await this.fedMultiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            let fedTxIndes = 0;
            let tx = await this.fedMultiSig.transactions(fedTxIndes);
            assert.equal(tx.executed, false);
        });

        it('should accept a transfer', async function() {
            let data = this.mirrorBridge.contract.methods.acceptTransfer(
                this.token.address,
                anAccount,
                anAccount,
                this.amount,
                'MAIN',
                this.txReceipt.receipt.blockHash,
                this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex,
                this.decimals,
                this.granularity,
                this.typeId,
            ).encodeABI();
            await this.fedMultiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            let fedTxIndes = 0;
            await this.fedMultiSig.confirmTransaction(fedTxIndes, { from: multiSigOnwerB });

            let tx = await this.fedMultiSig.transactions(fedTxIndes);
            assert.equal(tx.executed, true);

            let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
            let sideToken = await SideToken.at(sideTokenAddress);
            const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
            assert.equal(mirrorBridgeBalance, 0);
        });

        it('should not allow to set a feePercentage due to missing signatures', async function() {
            let feePercentage = await this.mirrorBridge.getFeePercentage();

            let data = this.mirrorBridge.contract.methods.setFeePercentage('200').encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            let feePercentageAfter = await this.mirrorBridge.getFeePercentage();
            assert.equal(feePercentage.toString(), feePercentageAfter.toString());
        });

        it('should allow to set a feePercentage', async function() {
            let newPayment = '200'; //2%
            let data = this.mirrorBridge.contract.methods.setFeePercentage(newPayment).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            let feePercentageAfter = await this.mirrorBridge.getFeePercentage();
            assert.equal(feePercentageAfter.toString(), newPayment);
        });

        it('should allow to set a new federation', async function() {
            let data = this.mirrorBridge.contract.methods.changeFederation(federation).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            let federationAfter = await this.mirrorBridge.getFederation();
            assert.equal(federationAfter, federation);
        });

        it('should pause the bridge contract', async function() {
            let isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, false);

            let data = this.mirrorBridge.contract.methods.pause().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, true);
        });

        it('should unpause the bridge contract', async function() {
            let data = this.mirrorBridge.contract.methods.unpause().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, false);
        });

        it('should renounce ownership', async function() {
            let data = this.mirrorBridge.contract.methods.renounceOwnership().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let owner = await this.mirrorBridge.owner();
            assert.equal(BigInt(owner), 0);
        });

        it('should transfer ownership', async function() {
            let data = this.mirrorBridge.contract.methods.transferOwnership(bridgeManager).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let owner = await this.mirrorBridge.owner();
            assert.equal(owner, bridgeManager);
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

            it('should reject receiveTokens ERC20', async function () {
                const amount = web3.utils.toWei('1000');
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokensTo(this.token.address, tokenOwner, amount, { from: tokenOwner }));
            });

            it('should reject tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.setToken(erc777.address, this.typeId, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                await utils.expectThrow(erc777.send(this.bridge.address, amount, tokenOwner, { from: tokenOwner }));
            });

            it('should accept transfer for the token', async function () {
                const amount = web3.utils.toWei('1000');
                let receipt = await this.bridge.acceptTransfer(this.token.address, anAccount, anAccount, amount, "MAIN",
                randomHex(32), randomHex(32), 1, '18', '1', this.typeId, { from: federation });
                utils.checkRcpt(receipt);

                let sideTokenAddress = await this.bridge.mappedTokens(this.token.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "eMAIN");

                let originalTokenAddress = await this.bridge.originalTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.bridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, amount);
            });
        });
    });

    describe('change SideTokenFactory', async function() {
        
        it('should reject empty address', async function () {
            await utils.expectThrow(this.bridge.changeSideTokenFactory(utils.NULL_ADDRESS, { from: bridgeManager }));
        });

        it('should be successful', async function () {
            let newAddress = randomHex(20);
            await this.bridge.changeSideTokenFactory(newAddress, { from: bridgeManager });
            let result = await this.bridge.sideTokenFactory();
            assert.equal(result.toLowerCase(), newAddress.toLowerCase());
        });
    });

});

