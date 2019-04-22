const MainToken = artifacts.require('./MainToken');
const Bridge = artifacts.require('./Bridge');

const expectThrow = require('./utils').expectThrow;

contract('Bridge', function (accounts) {
    const bridgeOwner = accounts[0];
    const tokenOwner = accounts[1];
    const bridgeManager = accounts[2];
    const anAccount = accounts[3];
    const newBridgeManager = accounts[4];
    const tokenAddress = accounts[5];
    const anotherAccount = accounts[6];
    
    describe('bridge with token contract', function () {
        beforeEach(async function () {
            this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
            this.bridge = await Bridge.new(bridgeManager, this.token.address, { from: bridgeOwner });
        });
        
        it('check manager', async function () {
            const manager = await this.bridge.manager();
            
            assert.equal(manager, bridgeManager);
        });

        it('check token', async function () {
            const token = await this.bridge.token();
            
            assert.equal(token, this.token.address);
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

        it('accept transfer', async function () {
            await this.token.transfer(this.bridge.address, 1000, { from: tokenOwner });
            
            const tokenBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenBalance, 9000);
            
            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 1000);

            await this.bridge.acceptTransfer(anAccount, 500, { from: bridgeManager });

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 500);
            
            const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(newBridgeBalance, 500);
        });

        it('accept transfer only manager', async function () {
            await this.token.transfer(this.bridge.address, 1000, { from: tokenOwner });
            
            const tokenBalance = await this.token.balanceOf(tokenOwner);
            assert.equal(tokenBalance, 9000);
            
            const bridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(bridgeBalance, 1000);

            expectThrow(this.bridge.acceptTransfer(anAccount, 500, { from: bridgeOwner }));
            expectThrow(this.bridge.acceptTransfer(anAccount, 500, { from: anAccount }));

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);
            
            const newBridgeBalance = await this.token.balanceOf(this.bridge.address);
            assert.equal(newBridgeBalance, 1000);
        });
    });
    
    describe('bridge with token address', function () {
        beforeEach(async function () {
            this.bridge = await Bridge.new(bridgeManager, tokenAddress, { from: bridgeOwner });
        });
        
        it('calling token fallback', async function () {
            const result = await this.bridge.tokenFallback(anAccount, 100, "0x010203", { from: tokenAddress });
            
            assert.ok(result);
        });
        
        it('only token can call token fallback', async function () {
            expectThrow(this.bridge.tokenFallback(anAccount, 100, "0x010203", { from: anAccount }));
        });
    });
    
    describe('bridge maps addresses', function () {
        beforeEach(async function () {
            this.bridge = await Bridge.new(bridgeManager, tokenAddress, { from: bridgeOwner });
        });
        
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

