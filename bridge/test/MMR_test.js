const MMR = artifacts.require('./MMR.sol');

const utils = require('./utils');

contract('MMR', async function (accounts) {
    beforeEach(async function () {
        this.mmr = await MMR.new();
    });
    
    it('create with initial values', async function() {
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 0);
        
        for (let k = 0; k < 64; k++) {
            const hash = await this.mmr.hashes(k);            
            assert.equal(hash, 0);
        }
    });
    
    it('calculate one block', async function() {
        const initialBlock = await this.mmr.nblock();
        const tx = await this.mmr.calculate();
        utils.checkRcpt(tx);
        const newBlock = await this.mmr.nblock();
        
        assert.equal(newBlock.toNumber(), initialBlock.toNumber() + 1);
        
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 1);
        
        const nhash = await this.mmr.nhash();
        assert.notEqual(nhash, 0);
        
        const hash = await this.mmr.hashes(0);        
        assert.notEqual(hash, 0);
        
        for (let k = 1; k < 64; k++) {
            const hash = await this.mmr.hashes(k);
            assert.equal(hash, 0);
        }
    });
    
    it('calculate two blocks', async function() {
        const initialBlock = await this.mmr.nblock();
        let tx = await this.mmr.calculate();
        utils.checkRcpt(tx);
        tx = await this.mmr.calculate();
        utils.checkRcpt(tx);
        const newBlock = await this.mmr.nblock();
        
        assert.equal(newBlock.toNumber(), initialBlock.toNumber() + 2);
        
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 2);

        const nhash = await this.mmr.nhash();
        assert.notEqual(nhash, 0);

        const hash = await this.mmr.hashes(0);        
        assert.equal(hash, 0);
        
        const hash2 = await this.mmr.hashes(1);
        assert.notEqual(hash2, 0);
        
        for (let k = 2; k < 64; k++) {
            const hash = await this.mmr.hashes(k);
            assert.equal(hash, 0);
        }
    });
});