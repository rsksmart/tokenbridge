const MainToken = artifacts.require('./MainToken');
const SideToken = artifacts.require('./SideToken');
const Bridge = artifacts.require('./Bridge');

const expectThrow = require('./utils').expectThrow;

contract('Bridge', function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const anotherAccount = accounts[6];
    
    describe('Main Side', function () {
        beforeEach(async function () {
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
            this.bridge = await Bridge.new(bridgeManager, 'e'.charCodeAt(), { from: bridgeOwner });
        });
        describe('manager', function () {
            it('check manager', async function () {
                const manager = await this.bridge.manager();
                
                assert.equal(manager, bridgeManager);
            });

            it('change manager', async function () {
                await this.bridge.changeManager(newBridgeManager, { from: bridgeManager });
                
                const manager = await this.bridge.manager();
                
                assert.equal(manager, newBridgeManager);
            });

            it('only manager can change manager', async function () {
                expectThrow(this.bridge.changeManager(newBridgeManager));
                
                const manager = await this.bridge.manager();
                
                assert.equal(manager, bridgeManager);
            });
        });

        it('receiveTokens (approve and transferFrom)', async function () {
            const amount = 1000;
            await this.token.approve(this.bridge.address, amount, { from: tokenOwner });
            await this.bridge.receiveTokens(this.token.address, amount, { from: tokenOwner });

            const tokenBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenBalance, 9000);
            
            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, amount);
        });

        describe('maps addresses', function () {
            
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

    describe('Mirror Side', function () {
        beforeEach(async function () {
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
            this.bridge = await Bridge.new(bridgeManager, 'e'.charCodeAt(), { from: bridgeOwner });
            this.mirrorBridge = await Bridge.new(bridgeManager, 'r'.charCodeAt(), { from: bridgeOwner });

            this.amount = 1000;
            await this.token.approve(this.bridge.address, this.amount, { from: tokenOwner });
            await this.bridge.receiveTokens(this.token.address, this.amount, { from: tokenOwner });
        });

        describe('Cross the tokens', function () {
            it('accept transfer', async function () {
                await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });

                let mirrorTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                let mirrorToken = await SideToken.at(mirrorTokenAddress);
                
                let originalTokenAddress = await this.mirrorBridge.mirrorTokens(mirrorTokenAddress);
                assert.equal(originalTokenAddress, this.token.address);

                const mirrorBridgeBalance = await mirrorToken.balanceOf(this.mirrorBridge.address);
                assert.equal(mirrorBridgeBalance, 0);
                const mirrorAnAccountBalance = await mirrorToken.balanceOf(anAccount);
                assert.equal(mirrorAnAccountBalance, this.amount);
            });

            it('accept transfer only manager', async function () {
                expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeOwner }));
                expectThrow(this.bridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: anAccount }));

                const anAccountBalance = await this.token.balanceOf(anAccount);
                assert.equal(anAccountBalance, 0);
                
                const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
                assert.equal(newBridgeBalance, 1000);

                let mirrorTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);
                assert.equal(mirrorTokenAddress, 0);
            });
        });

        describe('After Token Crossed', function () {
            describe('token fallback', function () {
                beforeEach(async function () {
                    await this.mirrorBridge.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN", { from: bridgeManager });
                });

                it('calling token fallback', async function () {
                    let mirrorTokenAddress = await this.mirrorBridge.mappedTokens(this.token.address);

                    const result = await this.mirrorBridge.tokenFallback(anAccount, 100, "0x010203", { from: mirrorTokenAddress });
                    
                    assert.ok(result);
                });
                
                it('only token can call token fallback', async function () {
                    expectThrow(this.mirrorBridge.tokenFallback(anAccount, 100, "0x010203", { from: anAccount }));
                });
            });
        });
        
    });
    
});

