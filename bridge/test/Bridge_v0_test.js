const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge_v0');
const AllowTokens = artifacts.require('./AllowTokens');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const MultiSigWallet = artifacts.require('./MultiSigWallet');

const utils = require('./utils');
const BN = web3.utils.BN;
const ONE_DAY = 24*3600

contract('Bridge_v0', async function (accounts) {
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
        this.bridge = await Bridge.new();
        await this.bridge.methods['initialize(address,address,address,address,string)'](bridgeManager, federation, this.allowTokens.address, this.sideTokenFactory.address, 'e', { from: bridgeOwner });
        await this.sideTokenFactory.transferOwnership(this.bridge.address);
    });

    describe('Main network', async function () {
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

            it('setCrossingPayment successful', async function () {
                const payment = 1000;
                await this.bridge.setCrossingPayment(payment, { from: bridgeManager});
                let result = await this.bridge.getCrossingPayment();
                assert.equal(result, payment);
            });

            it('setCrossingPayment should fail if not the owner', async function () {
                const payment = 1000;
                await utils.expectThrow(this.bridge.setCrossingPayment(payment, { from: tokenOwner}));
                let result = await this.bridge.getCrossingPayment();
                assert.equal(result, 0);
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
                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('tokenFallback for ERC677 and ERC223', async function () {
                const amount = web3.utils.toWei('1000');
                const originalTokenBalance = await this.token.balanceOf(tokenOwner);
                let receipt = await this.token.transferAndCall(this.bridge.address, amount, "0x", { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('tokensReceived for ERC777', async function () {
                const amount = web3.utils.toWei('1000');
                let erc777 = await SideToken.new("ERC777", "777", [tokenOwner], { from: tokenOwner });
                await this.allowTokens.addAllowedToken(erc777.address, { from: bridgeManager });
                await erc777.operatorMint(tokenOwner, amount, "0x", "0x", {from: tokenOwner });
                const originalTokenBalance = await erc777.balanceOf(tokenOwner);
                let receipt = await erc777.send(this.bridge.address, amount, "0x", { from: tokenOwner });
                utils.checkRcpt(receipt);

                const tokenBalance = await erc777.balanceOf(tokenOwner);
                assert.equal(tokenBalance.toString(), new BN(originalTokenBalance).sub(new BN(amount)).toString());
                const bridgeBalance = await erc777.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(erc777.address);
                assert.equal(isKnownToken, true);
            });

            it('send money to contract should fail', async function () {
                const payment = 1000;
                await utils.expectThrow(web3.eth.sendTransaction( { from:tokenOwner,
                    to: this.bridge.address, value: payment } ));
            });


            it('receiveTokens with payment successful', async function () {
                const payment = 1000;
                const amount = web3.utils.toWei('1000');
                await this.bridge.setCrossingPayment(payment, { from: bridgeManager});
                let balance = new BN(await web3.eth.getBalance(bridgeManager));
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });

                let receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner, value: payment });
                utils.checkRcpt(receipt);

                let newBalance = new BN(await web3.eth.getBalance(bridgeManager));
                assert.equal(balance.add(new BN(payment)).toString(), newBalance.toString());
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('receiveTokens should fail with unsuficient payment', async function () {
                const payment = 1000;
                const amount = web3.utils.toWei('1000');
                await this.bridge.setCrossingPayment(payment, { from: bridgeManager});
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner, value: 0 }));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('receiveTokens should reject token not allowed', async function () {
                let newToken = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000000'), { from: tokenOwner });
                const amount = web3.utils.toWei('1000');
                await newToken.approve(this.bridge.address, amount, { from: tokenOwner });
                await utils.expectThrow(this.bridge.receiveTokens(newToken.address, amount, { from: tokenOwner }));
            });

            it('rejects to receive tokens greater than  max tokens allowed', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let amount = maxTokensAllowed.add(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens lesser than  min tokens allowed', async function() {
                let minTokensAllowed = await this.allowTokens.getMinTokensAllowed();
                let amount = minTokensAllowed.sub(new BN('1'));
                await this.token.approve(this.bridge.address, amount.toString(), { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount.toString(), { from: tokenOwner}));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive tokens over the daily limit', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let dailyLimit = await this.allowTokens.dailyLimit();

                for(var tokensSent = 0; tokensSent < dailyLimit; tokensSent = BigInt(maxTokensAllowed) + BigInt(tokensSent)) {
                    await this.token.approve(this.bridge.address, maxTokensAllowed, { from: tokenOwner });
                    await this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner })
                }
                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, maxTokensAllowed, { from: tokenOwner}));
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


        });

    });

    describe('Mirror Side', async function () {
        beforeEach(async function () {
            this.mirrorAllowTokens = await AllowTokens.new(bridgeManager);
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();
            await this.mirrorBridge.methods['initialize(address,address,address,address,string)'](bridgeManager, federation, this.mirrorAllowTokens.address, this.mirrorSideTokenFactory.address, 'r', { from: bridgeOwner });
            await this.mirrorSideTokenFactory.transferOwnership(this.mirrorBridge.address);

            this.amount = web3.utils.toWei('1000');
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
        });

        describe('Cross the tokens', async function () {
            it('accept transfer', async function () {
                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: federation });
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

            it('accept transfer only federation', async function () {
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeOwner }));
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager }));

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
                    this.txReceipt.receipt.logs[0].logIndex, { from: federation });

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, { from: federation }));

            });
        });

        describe('Cross back the tokens', async function () {
            beforeEach(async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: federation });
                this.amountToCrossBack = web3.utils.toWei('100');
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
                        this.txReceipt.receipt.logs[0].logIndex, { from: federation });
                    utils.checkRcpt(tx);

                    let bridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(bridgeBalance, this.amount - this.amountToCrossBack);

                    let anAccountBalance = await this.token.balanceOf(anAccount);
                    assert.equal(anAccountBalance, this.amountToCrossBack);
                });

                it('only SideToken can call token fallback', async function () {
                    await utils.expectThrow(this.mirrorBridge.tokenFallback(anAccount, web3.utils.toWei('100'), "0x010203", { from: anAccount }));
                });
            });

        });

    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[7];
        const multiSigOnwerB = accounts[8];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.fedMultiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.allowTokens = await AllowTokens.new(this.multiSig.address);
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();

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

            await this.mirrorSideTokenFactory.transferOwnership(this.mirrorBridge.address);

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
                this.txReceipt.receipt.logs[0].logIndex
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
                this.txReceipt.receipt.logs[0].logIndex
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

        it('should not allow to set a crossing payment due to missing signatures', async function() {
            let crossingPayment = await this.mirrorBridge.getCrossingPayment();

            let data = this.mirrorBridge.contract.methods.setCrossingPayment(2000).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(2);
            assert.equal(tx.executed, false);

            let crossingPaymentAfter = await this.mirrorBridge.getCrossingPayment();
            assert.equal(crossingPayment.toString(), crossingPaymentAfter.toString());
        });

        it('should allow to set a crossing payment', async function() {
            let newPayment = '2000';
            let data = this.mirrorBridge.contract.methods.setCrossingPayment(newPayment).encodeABI();
            await this.multiSig.submitTransaction(this.mirrorBridge.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(2, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(2);
            assert.equal(tx.executed, true);

            let crossingPaymentAfter = await this.mirrorBridge.getCrossingPayment();
            assert.equal(crossingPaymentAfter.toString(), newPayment);
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

});

