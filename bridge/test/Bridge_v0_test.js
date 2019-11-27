const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge_v0');
const AllowTokens = artifacts.require('./AllowTokens');
const SideTokenFactory = artifacts.require('./SideTokenFactory');

const utils = require('./utils');
const BN = web3.utils.BN;

contract('Bridge_v0', async function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const anotherAccount = accounts[6];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
        this.allowTokens = await AllowTokens.new(bridgeManager);
        await this.allowTokens.disableAllowedTokensValidation({from: bridgeManager});
        this.sideTokenFactory = await SideTokenFactory.new();
        this.bridge = await Bridge.new();
        await this.bridge.methods['initialize(address,address,address,string)'](bridgeManager, this.allowTokens.address, this.sideTokenFactory.address, 'e', { from: bridgeOwner });
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
                const amount = 1000;
                await this.bridge.setCrossingPayment(amount, { from: bridgeManager});
                let result = await this.bridge.crossingPayment();
                assert.equal(result, amount);
            });

            it('setCrossingPayment should fail if not the owner', async function () {
                const amount = 1000;
                await utils.expectThrow(this.bridge.setCrossingPayment(amount, { from: tokenOwner}));
                let result = await this.bridge.crossingPayment();
                assert.equal(result, 0);
            });

        });

        describe('receiveTokens', async function () {
            it('emit event approve and transferFrom token contract', async function () {
                const amount = 1000;

                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
                let receipt = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
                utils.checkRcpt(receipt);

                assert.equal(receipt.logs[0].event, 'Cross');
                const tokenBalance = await this.token.balanceOf(tokenOwner);
                assert.equal(tokenBalance, 9000);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, amount);
                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, true);
            });

            it('send money to contract should fail', async function () {
                const amount = 1000;
                await utils.expectThrow(web3.eth.sendTransaction( { from:tokenOwner,
                    to: this.bridge.address, value: amount } ));
            });


            it('receiveTokens with payment successful', async function () {
                const payment = 1000;
                const amount = 1000;
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
                const amount = 1000;
                await this.bridge.setCrossingPayment(payment, { from: bridgeManager});
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner, value: 0 }));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

            it('rejects to receive an amount greater than allowed', async function() {
                let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
                let amount = maxTokensAllowed + 1;

                const payment = 1000;
                await this.bridge.setCrossingPayment(payment, { from: bridgeManager});
                await this.token.approve(this.bridge.address, amount, { from: tokenOwner });

                await utils.expectThrow(this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner, value: 0 }));

                const isKnownToken = await this.bridge.knownTokens(this.token.address);
                assert.equal(isKnownToken, false);
                const bridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(bridgeBalance, 0);
            });

        });

        describe('maps addresses', async function () {
            it('not mapped address', async function () {
                const result = await this.bridge.getMappedAddress(anAccount);

                assert.ok(result);
                assert.equal(result, anAccount);
            });

            it('map address', async function () {
                await this.bridge.mapAddress(anotherAccount, { from: anAccount });

                const result = await this.bridge.getMappedAddress(anAccount);

                assert.ok(result);
                assert.equal(result, anotherAccount);
            });
        });

    });

    describe('Mirror Side', async function () {
        beforeEach(async function () {
            this.mirrorAllowTokens = await AllowTokens.new(bridgeManager);
            this.mirrorSideTokenFactory = await SideTokenFactory.new();
            this.mirrorBridge = await Bridge.new();
            await this.mirrorBridge.methods['initialize(address,address,address,string)'](bridgeManager, this.mirrorAllowTokens.address, this.mirrorSideTokenFactory.address, 'r', { from: bridgeOwner });
            await this.mirrorSideTokenFactory.transferOwnership(this.mirrorBridge.address);

            this.amount = 1000;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            this.txReceipt = await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
        });

        describe('Cross the tokens', async function () {
            it('accept transfer', async function () {
                let receipt = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager });
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

            it('accept transfer only manager', async function () {
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeOwner }));
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: anAccount }));

                const anAccountBalance = await this.token.balanceOf(anAccount);
                assert.equal(anAccountBalance, 0);

                const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(newBridgeBalance, 1000);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(sideTokenAddress, 0);
            });

            it('dont accept transfer the same transaction', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager });

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);

                await utils.expectThrow(this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager }));

            });
        });

        describe('Cross back the tokens', async function () {
            beforeEach(async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    this.txReceipt.receipt.blockHash, this.txReceipt.tx,
                    this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager });
                this.amountToCrossBack = 100;
            });
            describe('Should burn the side tokens when transfered to the bridge', function () {
                it('using IERC20 approve and transferFrom', async function () {
                    let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
    
                    let sideToken = await SideToken.at(sideTokenAddress);
                    let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance, this.amount);
    
                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    let receipt = await sideToken.approve(this.mirrorBridge.address, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);
                    receipt = await this.mirrorBridge.receiveTokens(sideTokenAddress, this.amountToCrossBack, { from: anAccount });
                    utils.checkRcpt(receipt);
    
                    mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                    assert.equal(mirrorAnAccountBalance, this.amount - this.amountToCrossBack);
    
                    let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                    assert.equal(mirrorBridgeBalance, 0);
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
                        this.txReceipt.receipt.logs[0].logIndex, { from: bridgeManager });
                    utils.checkRcpt(tx);

                    let bridgeBalance = await this.token.balanceOf(this.bridge.address);
                    assert.equal(bridgeBalance, this.amount - this.amountToCrossBack);

                    let anAccountBalance = await this.token.balanceOf(anAccount);
                    assert.equal(anAccountBalance, this.amountToCrossBack);
                });

                it('only SideToken can call token fallback', async function () {
                    await utils.expectThrow(this.mirrorBridge.tokenFallback(anAccount, 100, "0x010203", { from: anAccount }));
                });
            });

        });

    });

});

