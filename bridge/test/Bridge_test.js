const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');

const utils = require('./utils');

contract('Bridge', async function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const anotherAccount = accounts[6];
    
    beforeEach(async function () {
        this.blocksBetweenCrossEvents = 0, 
        this.minimumPedingTransfersCount = 0;
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
        this.bridge = await Bridge.new(bridgeManager, 'e'.charCodeAt(), this.blocksBetweenCrossEvents, this.minimumPedingTransfersCount, { from: bridgeOwner });
    });

    describe('Main Side', async function () {
        describe('manager', async function () {
            it('check manager', async function () {
                const manager = await this.bridge.manager();
                
                assert.equal(manager, bridgeManager);
            });

            it('change manager', async function () {
                const tx = await this.bridge.changeManager(newBridgeManager, { from: bridgeManager });
                utils.checkRcpt(tx);

                const manager = await this.bridge.manager();                
                assert.equal(manager, newBridgeManager);
            });

            it('only manager can change manager', async function () {
                await utils.expectThrow(this.bridge.changeManager(newBridgeManager));
                
                const manager = await this.bridge.manager();
                
                assert.equal(manager, bridgeManager);
            });
        });

        it('receiveTokens (approve and transferFrom)', async function () {
            const amount = 1000;
            await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
            let tx = await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });
            utils.checkRcpt(tx);

            const tokenBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenBalance, 9000);
            
            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, amount);
        });

        it('emmitEvent', async function () {
            const amount = 1000;
            await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
            await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });

            let pendingTransfersCount = await this.bridge.pendingTransfersCount();
            assert.equal(pendingTransfersCount, 1);

            let tx = await this.bridge.emmitEvent();
            utils.checkRcpt(tx);

            pendingTransfersCount = await this.bridge.pendingTransfersCount();
            assert.equal(pendingTransfersCount, 0);
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
        beforeEach(async function () {;
            this.mirrorBridge = await Bridge.new(bridgeManager, 'r'.charCodeAt(), this.blocksBetweenCrossEvents, this.minimumPedingTransfersCount, { from: bridgeOwner });

            this.amount = 1000;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
            await this.bridge.emmitEvent();
        });

        describe('Cross the tokens', async function () {
            it('accept transfer', async function () {
                let tx = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });
                utils.checkRcpt(tx);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                let sideToken = await SideToken.at(sideTokenAddress);
                const sideTokenSymbol = await sideToken.symbol();
                assert.equal(sideTokenSymbol, "rMAIN");
                
                let originalTokenAddress = await this.mirrorBridge.sideTokens(sideTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);
                
            });

            it('accept transfer only manager', async function () {
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeOwner }));
                await utils.expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: anAccount }));

                const anAccountBalance = await this.token.balanceOf(anAccount);
                assert.equal(anAccountBalance, 0);
                
                const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(newBridgeBalance, 1000);

                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(sideTokenAddress, 0);
            });

            it('accept transfer same token', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });

                const sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                const sideToken = await SideToken.at(sideTokenAddress);

                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);
                
                let tx = await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });
                utils.checkRcpt(tx);

                const secondCallSideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(secondCallSideTokenAddress, sideTokenAddress);

                mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance.toNumber(), this.amount*2);
                
            });
        });

        describe('Cross back the tokens', async function () {
            beforeEach(async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });
                this.amountToCrossBack = 100;
            });

            it('should burn the side tokens when transfered to the bridge', async function () {
                let sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                let sideToken = await SideToken.at(sideTokenAddress);
                let mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);

                //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                const tx = await sideToken.transferAndCall(this.mirrorBridge.address, this.amountToCrossBack, "0x", { from: anAccount });
                utils.checkRcpt(tx);

                mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount - this.amountToCrossBack);

                let mirrorBridgeBalance = await sideToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0); 
                
                let pendingTransfersCount = await this.mirrorBridge.pendingTransfersCount();
                assert.equal(pendingTransfersCount, 1);
            });
            describe('After the mirror Bridge burned the tokens', function () {
                beforeEach(async function () {
                    this.sideTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                    this.sideToken = await SideToken.at(this.sideTokenAddress);

                    //Transfer the Side tokens to the bridge, the bridge burns them and creates an event
                    await this.sideToken.transferAndCall(this.mirrorBridge.address, this.amountToCrossBack, "0x", { from: anAccount });
                });

                it('should emmit event to cross', async function () {
                    let pendingTransfersCount = await this.mirrorBridge.pendingTransfersCount();
                    assert.equal(pendingTransfersCount, 1);

                    let tx = await this.mirrorBridge.emmitEvent();
                    utils.checkRcpt(tx);

                    pendingTransfersCount = await this.mirrorBridge.pendingTransfersCount();
                    assert.equal(pendingTransfersCount, 0);
                });

                it('main Bridge should relealse the tokens', async function () {
                    //The submitter sends the event to the manager, once the manager validates it, it calls the bridge that release the tokens
                    let tx = await this.bridge.acceptTransfer(this.token.address, anAccount, this.amountToCrossBack, "SIDE", { from: bridgeManager });
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

