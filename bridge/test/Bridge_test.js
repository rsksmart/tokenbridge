const MainToken = artifacts.require('./MainToken');
const AlternativeERC20Detailed = artifacts.require('./AlternativeERC20Detailed');
const SideToken = artifacts.require('./SideToken_v2');
const Bridge = artifacts.require('./Bridge_v1');
const AllowTokens = artifacts.require('./AllowTokens');
const SideTokenFactory = artifacts.require('./SideTokenFactory_v2');
const MultiSigWallet = artifacts.require('./MultiSigWallet');
const UtilsContract = artifacts.require('./Utils');
const mockReceiveTokensCall = artifacts.require('./mockReceiveTokensCall');

const utils = require('./utils');
const BN = web3.utils.BN;
const randomHex = web3.utils.randomHex;
const ONE_DAY = 24*3600;

contract('Bridge_v1', async function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const federation = accounts[5];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
        this.allowTokens = await AllowTokens.new(bridgeManager);
        await this.allowTokens.addAllowedToken(this.token.address, {from: bridgeManager});
        this.sideTokenFactory = await SideTokenFactory.new();
        this.utilsContract = await UtilsContract.deployed();
        await Bridge.link(UtilsContract, this.utilsContract.address);
        this.bridge = await Bridge.new();
        await this.bridge.methods['initialize(address,address,address,address,string)'](bridgeManager,
            federation, this.allowTokens.address, this.sideTokenFactory.address, 'e');
        await this.sideTokenFactory.transferPrimary(this.bridge.address);
    });

    describe('Main network', async function () {

        it('should retrieve the version', async function () {
            const result = await this.bridge.version();
            assert.equal(result, "v1");
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
                const fedAddress = await this.bridge.getFederation();
                assert.equal(fedAddress, federation);
            });

            it('change federation', async function () {
                const receipt = await this.bridge.changeFederation(newBridgeManager, { from: bridgeManager });
                utils.checkRcpt(receipt);
                const fedAddress = await this.bridge.getFederation();
                assert.equal(fedAddress, newBridgeManager);
            });

            it('only manager can change the federation', async function () {
                await utils.expectThrow(this.bridge.changeFederation(newBridgeManager));
                const fedAddress = await this.bridge.getFederation();
                assert.equal(fedAddress, federation);
            });

            it('change federation new fed cant be null', async function () {
                await utils.expectThrow(this.bridge.changeFederation(utils.NULL_ADDRESS, { from: bridgeManager }));
                const fedAddress = await this.bridge.getFederation();
                assert.equal(fedAddress, federation);
            });

        });

        describe('receiveTokens', async function () {
            it('receiveTokens approve and transferFrom for ERC20', async function () {
                const amount = web3.utils.toWei('1000');
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], this.token.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], amount);
                assert.equal(receipt.logs[0].args[3], await this.token.symbol());
                assert.equal(receipt.logs[0].args[4], null);
                assert.equal(receipt.logs[0].args[5].toString(), (await this.token.decimals()).toString());
                assert.equal(receipt.logs[0].args[6].toString(), '1');

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Max allowed tokens 18 decimals', async function () {
                const amount = await this.allowTokens.getMaxTokensAllowed();
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Min allowed tokens 18 decimals', async function () {
                const amount = await this.allowTokens.getMinTokensAllowed();
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC20 Max allowed tokens 8 decimals', async function () {
                const maxTokens = await this.allowTokens.getMaxTokensAllowed()
                const amount = new BN(maxTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });
                this.allowTokens.addAllowedToken(token.address, {from: bridgeManager});
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(token.address);
                assert.equal(isKnownToken, true);
            });


            it('receiveTokens approve and transferFrom for ERC20 Min allowed tokens 8 decimals', async function () {
                const minTokens = await this.allowTokens.getMinTokensAllowed()
                const amount = new BN(minTokens).div(new BN((10**10).toString()));
                let token = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa('x'), '8', amount, { from: tokenOwner });
                this.allowTokens.addAllowedToken(token.address, {from: bridgeManager});
                const originalTokenBalance = await token.balanceOf(tokenOwner);
                let receipt = await token.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance.toString(), amount.toString());
                const isKnownToken = await this.bridge.knownTokens(token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom Alternative ERC20 Detailed', async function () {
                const amount = web3.utils.toWei('1000', 'gwei');
                const decimals = '10';
                const symbol = "ERC20";
                let erc20Alternative = await AlternativeERC20Detailed.new("AlternativeERC20Detailed", utils.ascii_to_hexa(symbol), decimals, amount, { from: tokenOwner });
                await this.allowTokens.addAllowedToken(erc20Alternative.address, { from: bridgeManager });
                const originalTokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                let receipt = await erc20Alternative.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(erc20Alternative.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], erc20Alternative.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], amount);
                assert.equal(receipt.logs[0].args[3], symbol);
                assert.equal(receipt.logs[0].args[4], null);
                assert.equal(receipt.logs[0].args[5].toString(), decimals);
                assert.equal(receipt.logs[0].args[6].toString(), '1');

                const tokenBalance = await erc20Alternative.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc20Alternative.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc20Alternative.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens approve and transferFrom for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '1000';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });

                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let receipt = await erc777.approve(this.bridge.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);
                receipt = await this.bridge.receiveTokens(erc777.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                assert.equal(receipt.logs[0].args[0], erc777.address);
                assert.equal(receipt.logs[0].args[1], tokenOwner);
                assert.equal(receipt.logs[0].args[2], amount);
                assert.equal(receipt.logs[0].args[3], await erc777.symbol());
                assert.equal(receipt.logs[0].args[4], null);
                assert.equal(receipt.logs[0].args[5].toString(), (await erc777.decimals()).toString());
                assert.equal(receipt.logs[0].args[6].toString(), granularity);

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

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x1100';
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,uint256,string,bytes,uint8,uint256)');
                assert.equal(result.receipt.rawLogs[2].topics[0], eventSignature);
                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
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
                    }
                  ], result.receipt.rawLogs[2].data, result.receipt.rawLogs[2].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount);
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, userData);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());

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

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x1100';
                let result = await erc777.send(this.bridge.address, amount, userData, { from: tokenOwner });
                utils.checkRcpt(result);

                let eventSignature = web3.eth.abi.encodeEventSignature('Cross(address,address,uint256,string,bytes,uint8,uint256)');
                assert.equal(result.receipt.rawLogs[4].topics[0], eventSignature);

                let decodedLog = web3.eth.abi.decodeLog([
                    {
                      "indexed": true,
                      "name": "_tokenAddress",
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
                    }
                  ], result.receipt.rawLogs[4].data, result.receipt.rawLogs[4].topics.slice(1));

                assert.equal(decodedLog._tokenAddress, erc777.address);
                assert.equal(decodedLog._to, tokenOwner);
                assert.equal(decodedLog._amount, amount.sub(fees).toString());
                assert.equal(decodedLog._symbol, await erc777.symbol());
                assert.equal(decodedLog._userData, userData);
                assert.equal(decodedLog._decimals.toString(), (await erc777.decimals()).toString());
                assert.equal(decodedLog._granularity.toString(), (await erc777.granularity()).toString());

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

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x1100';
                await utils.expectThrow(this.bridge.tokensReceived(tokenOwner,tokenOwner, this.bridge.address, amount, userData, '0x', { from: tokenOwner }));
            });

            it('tokensReceived should fail if not directed to bridge', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let userData = '0x1100';
                await utils.expectThrow(this.bridge.tokensReceived(erc777.address, erc777.address, tokenOwner, amount, userData, '0x', { from: tokenOwner }));
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

                let receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
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

            it('receiveTokens should reject token not allowed', async function () {
                let newToken = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
                const amount = web3.utils.toWei('1000');
                await newToken.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokens(newToken.address, amount, { from: tokenOwner }));
            });

            it('receiveTokens should reject calling from a contract', async function () {
                let otherContract = await mockReceiveTokensCall.new(this.bridge.address);
                const amount = web3.utils.toWei('1000');
                await this.token.approve(otherContract.address, amount, { from: tokenOwner });
                await utils.expectThrow(otherContract.callReceiveTokens(this.token.address, amount));
            });

            it('rejects to receive tokens greater than  max tokens allowed 18 decimals', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let amount = maxTokensAllowed.add(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens greater than  max tokens allowed 8 decimals', async function() {
                let newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let amount = maxTokensAllowed.div(new BN((10**10).toString()).add(new BN('1')));
                await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(newToken.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(newToken.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await newToken.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens lesser than  min tokens allowed 18 decimals', async function() {
                let minTokensAllowed = await this.allowTokens.getMinTokensAllowed();
                let amount = minTokensAllowed.sub(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens greater than  min tokens allowed 8 decimals', async function() {
                let newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                let maxTokensAllowed = await this.allowTokens.getMinTokensAllowed();
                let amount = maxTokensAllowed.div(new BN((10**10).toString()).sub(new BN('1')));
                await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(newToken.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(newToken.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await newToken.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens over the daily limit 18 decimals', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let dailyLimit = await this.allowTokens.dailyLimit();

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner })
                }
                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner}));
            });

            it('rejects to receive tokens over the daily limit 8 decimals', async function() {
                const newToken = await MainToken.new("MAIN", "MAIN", 8, web3.utils.toWei('1000000000'), { from: tokenOwner });
                this.allowTokens.addAllowedToken(newToken.address, {from: bridgeManager});
                const maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                const amount = BigInt(maxTokensAllowed) / BigInt(10**10);
                const dailyLimit = await this.allowTokens.dailyLimit();

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await newToken.approve(this.bridge.address, amount.toString(), { from: tokenOwner });
                    await this.bridge.receiveTokens(newToken.address, amount.toString(), { from: tokenOwner })
                }
                await utils.expectThrow(this.bridge.receiveTokens(newToken.address, amount.toString(), { from: tokenOwner}));
            });

            it('clear spent today after 24 hours', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let dailyLimit = await this.allowTokens.dailyLimit();
                let maxWidthdraw = await this.bridge.calcMaxWithdraw();
                assert.equal(maxWidthdraw.toString(), maxTokensAllowed.toString());

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner })
                }
                maxWidthdraw = await this.bridge.calcMaxWithdraw();
                assert.equal(maxWidthdraw.toString(), '0');
                await utils.increaseTimestamp(web3, ONE_DAY+1);
                maxWidthdraw = await this.bridge.calcMaxWithdraw();
                assert.equal(maxWidthdraw.toString(), maxTokensAllowed.toString());
            });

            it('clear spent today and successfully receives tokens', async function() {
                const amount = web3.utils.toWei('1000');
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let dailyLimit = await this.allowTokens.dailyLimit();

                for(let tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner })
                }
                await utils.increaseTimestamp(web3, ONE_DAY + 1);

                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                let receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner});
                utils.checkRcpt(receipt);
            });

        });

    });

    describe('Mirror Side', async function () {
        beforeEach(async function () {
            this.mirrorAllowTokens = await AllowTokens.new(bridgeManager);
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();
            await this.mirrorBridge.methods['initialize(address,address,address,address,string)'](bridgeManager, 
                federation, this.mirrorAllowTokens.address, this.mirrorSideTokenFactory.address, 'r', { from: bridgeOwner });
            await this.mirrorSideTokenFactory.transferPrimary(this.mirrorBridge.address);

            this.amount = web3.utils.toWei('1000');
            this.decimals = (await this.token.decimals()).toString();
            this.granularity = 1;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
        });

        describe('Cross the tokens', async function () {
            it('accept transfer first time for the token', async function () {
                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation });
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
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation });

                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                randomHex(32), randomHex(32), 1, this.decimals, this.granularity, { from: federation });
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
                await this.allowTokens.addAllowedToken(tokenWithDecimals.address, {from: bridgeManager});

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, { from: federation });
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
                await this.allowTokens.addAllowedToken(tokenWithDecimals.address, {from: bridgeManager});

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, { from: federation })
                );
            });

            it('fail accept transfer with receiver empty address', async function () {
                let decimals = 18;
                let tokenWithDecimals = await MainToken.new("MAIN", "MAIN", decimals, web3.utils.toWei('1000000000'), { from: tokenOwner });
                await this.allowTokens.addAllowedToken(tokenWithDecimals.address, {from: bridgeManager});

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithDecimals.address, utils.NULL_ADDRESS, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, decimals, 1, { from: federation })
                );
            });

            it('accept transfer first time from ERC777 with granularity', async function () {
                const granularity = '100';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, granularity, { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.allowTokens.addAllowedToken(tokenWithGranularity.address, {from: bridgeManager});

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, { from: federation });
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
                await this.allowTokens.addAllowedToken(tokenWithGranularity.address, {from: bridgeManager});

                await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, { from: federation });

                let receipt = await this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    randomHex(32), randomHex(32), 1, this.decimals, granularity, { from: federation });
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
                await this.allowTokens.addAllowedToken(tokenWithGranularity.address, {from: bridgeManager});

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, { from: federation })
                );
            });

            it('accept transfer from ERC777 with granularity bigger than  10^18', async function () {
                const granularity = '10000000000000000000';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, '1', { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.allowTokens.addAllowedToken(tokenWithGranularity.address, {from: bridgeManager});

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, { from: federation })
                    );
            });

            it('accept transfer from ERC777 with granularity less than 1', async function () {
                const granularity = '0';
                let tokenWithGranularity = await SideToken.new("MAIN", "MAIN", tokenOwner, '1', { from: tokenOwner });
                tokenWithGranularity.mint(tokenOwner, this.amount, '0x', '0x', { from: tokenOwner });
                await this.allowTokens.addAllowedToken(tokenWithGranularity.address, {from: bridgeManager});

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(tokenWithGranularity.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, granularity, { from: federation })
                    );
            });

            it('accept transfer only federation', async function () {
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: bridgeOwner }));
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: bridgeManager }));

                const anAccountBalance = await this.token.balanceOf(anAccount);
                assert.equal(anAccountBalance, 0);

                const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(newBridgeBalance, this.amount);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(sideTokenAddress, 0);
            });

            it('dont accept transfer the same transaction', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation });

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));

            });

            it('should fail null token address', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer("0x", anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));

            });

            it('should fail null receiver address', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, 0, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));

            });

            it('should fail null amount address', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, 0, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));

            });

            it('should fail null symbol', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));

            });

            it('should fail null blockhash', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                "0x", this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));
            });

            it('should fail null transaction hash', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, "0x",
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation }));
            });

            it('should fail invalid decimals', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, '19', this.granularity, { from: federation }));
            });

            it('should fail granularity 0', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, new BN('0'), { from: federation }));
            });

            it('should fail more than max granularity', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, this.decimals, new BN('10000000000000000000'), { from: federation }));
            });

            it('should overflow granularity multiplication', async function () {
                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, web3.utils.toWei('100000000000000000000000000000000000000000000000000'), "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, 0, this.granularity, { from: federation }));
            });

        });

        describe('Cross back the tokens', async function () {
            beforeEach(async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation });
                this.amountToCrossBack = web3.utils.toWei('100');
                this.decimals = (await this.token.decimals()).toString();
                this.granularity = 1;
            });

            describe('Should burn the side tokens when transfered to the bridge', function () {
                it('using IERC20 approve and transferFrom', async function () {
                    let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                    let sideToken = await SideToken.at(sideTokenAddress);
                    let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    let receipt = await sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);
                    receipt = await this.mirrorBridge.receiveTokens(sideTokenAddress, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);

                    mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), new BN(this.amount).sub( new BN(this.amountToCrossBack)).toString());

                    let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance.toString(), '0');
                });

                it('using ERC777 tokensReceived', async function () {
                    let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                    let sideToken = await SideToken.at(sideTokenAddress);
                    let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), this.amount.toString());

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    let receipt = await sideToken.send(this.mirrorBridge.address, this.amountToCrossBack, "0x", { from: anAccount });
                    utils.checkRcpt(receipt);

                    mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance.toString(), new BN(this.amount).sub(new BN(this.amountToCrossBack)).toString());

                    let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance.toString(), '0');
                });

            });


            describe('After the mirror Bridge burned the tokens', function () {
                beforeEach(async function () {
                    this.sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                    this.sideToken = await SideToken.at(this.sideTokenAddress);

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    await this.sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    await this.mirrorBridge.receiveTokens(this.sideTokenAddress, this.amountToCrossBack, { from: anAccount });
                });

                it('main Bridge should release the tokens', async function () {
                    let tx = await this.bridge.acceptTransfer(this.token.address, anAccount, this.amountToCrossBack, "MAIN",
                        this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                        this.txReceipt.receipt.logs[0].logIndex, this.decimals, this.granularity, { from: federation });
                    utils.checkRcpt(tx);

                    let bridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(bridgeBalance, this.amount - this.amountToCrossBack);

                    let anAccountBalance = await this.token.balanceOf(anAccount);
                    assert.equal(anAccountBalance, this.amountToCrossBack);
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
            this.allowTokens = await AllowTokens.new(this.multiSig.address);
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
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            await this.mirrorSideTokenFactory.transferPrimary(this.mirrorBridge.address);

            data = this.allowTokens.contract.methods.addAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, true);

            this.amount = web3.utils.toWei('1000');
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
        });

        it('should not accept a transfer due to missing signatures', async function() {
            let data = this.mirrorBridge.contract.methods.acceptTransfer(
                this.token.address,
                anAccount,
                this.amount,
                'MAIN',
                this.txReceipt.receipt.blockHash,
                this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex,
                this.decimals,
                this.granularity
            ).encodeABI();
            await this.fedMultiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.fedMultiSig.transactions(0);
            assert.equal(tx.executed, false);
        });

        it('should accept a transfer', async function() {
            let data = this.mirrorBridge.contract.methods.acceptTransfer(
                this.token.address,
                anAccount,
                this.amount,
                'MAIN',
                this.txReceipt.receipt.blockHash,
                this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex,
                this.decimals,
                this.granularity
            ).encodeABI();
            await this.fedMultiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.fedMultiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.fedMultiSig.transactions(0);
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

            let tx = await this.multiSig.transactions(2);
            assert.equal(tx.executed, false);

            let feePercentageAfter = await this.mirrorBridge.getFeePercentage();
            assert.equal(feePercentage.toString(), feePercentageAfter.toString());
        });

        it('should allow to set a feePercentage', async function() {
            let newPayment = '200'; //2%
            let data = this.mirrorBridge.contract.methods.setFeePercentage(newPayment).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(2);
            assert.equal(tx.executed, true);

            let feePercentageAfter = await this.mirrorBridge.getFeePercentage();
            assert.equal(feePercentageAfter.toString(), newPayment);
        });

        it('should allow to set a new federation', async function() {
            let data = this.mirrorBridge.contract.methods.changeFederation(federation).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(2);
            assert.equal(tx.executed, true);

            let federationAfter = await this.mirrorBridge.getFederation();
            assert.equal(federationAfter, federation);
        });

        it('should pause the bridge contract', async function() {
            let isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, false);

            let data = this.mirrorBridge.contract.methods.pause().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, true);
        });

        it('should unpause the bridge contract', async function() {
            let data = this.mirrorBridge.contract.methods.unpause().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            let isPaused = await this.mirrorBridge.paused();
            assert.equal(isPaused, false);
        });

        it('should renounce ownership', async function() {
            let data = this.mirrorBridge.contract.methods.renounceOwnership().encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            let owner = await this.mirrorBridge.owner();
            assert.equal(BigInt(owner), 0);
        });

        it('should transfer ownership', async function() {
            let data = this.mirrorBridge.contract.methods.transferOwnership(bridgeManager).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

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

            await this.bridge.startUpgrade({ from: bridgeManager });
            isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);
        });

        it('Should not set upgrading of the bridge contract if not the owner', async function() {
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, false);

            await utils.expectThrow(this.bridge.startUpgrade());
            assert.equal(isUpgrading, false);
        });

        it('Should end upgrade of the bridge contract', async function() {
            await this.bridge.startUpgrade({ from: bridgeManager });
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);

            await this.bridge.endUpgrade({ from: bridgeManager });
            isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, false);
        });

        it('Should not end upgrade of the bridge contract if not the owner', async function() {
            await this.bridge.startUpgrade({ from: bridgeManager });
            let isUpgrading = await this.bridge.isUpgrading();
            assert.equal(isUpgrading, true);

            await utils.expectThrow(this.bridge.endUpgrade());
            assert.equal(isUpgrading, true);
        });

        describe('when Upgrading', async function() {
            beforeEach(async function() {
                await this.bridge.startUpgrade({ from: bridgeManager });
            });

            it('should reject receiveTokens ERC20', async function () {
                const amount = web3.utils.toWei('1000');
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner }));
            });

            it('should reject tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                const granularity = '100';
                let erc777 = await SideToken.new("ERC777", "777", tokenOwner, granularity, { from: tokenOwner });

                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.mint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                await utils.expectThrow(erc777.send(this.bridge.address, amount, '0x1100', { from: tokenOwner }));
            });

            it('should accept transfer for the token', async function () {
                const amount = web3.utils.toWei('1000');
                let receipt = await this.bridge.acceptTransfer(this.token.address, anAccount, amount, "MAIN",
                randomHex(32), randomHex(32), 1, '18', '1', { from: federation });
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

