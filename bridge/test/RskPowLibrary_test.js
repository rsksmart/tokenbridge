const RskPowHelper = artifacts.require('./RskPowHelper');

const utils = require('./utils');

contract('RskPow', async function () { 

    beforeEach(async function () {
        this.helper = await RskPowHelper.new();
    });

    it('getBitcoinBlockHash', async function () {
        const bitcoinMergedMiningHeader = '0x00008020332a7135f993b5e6710934f4be6f51fa65fa68f85ddff0def2020000000000009ad29cc7781bd54cd5ac45450f867d8eec4afaa728dd2cbc2f3392a62ef74498581c5b5d9c50041a5d6a4b71';
        const bitcoinMergedMiningHeaderHash = await this.helper.getBitcoinBlockHash(bitcoinMergedMiningHeader);

        assert.equal(bitcoinMergedMiningHeaderHash, '0x00000000000047d69690cc3bb6b9eae7fd260437b79584b59fa46b014177ad65');
    });

    it('difficultyToTarget', async function () {
        const difficulty = '423484912534602';
        const target = await this.helper.difficultyToTarget(difficulty);
        assert.equal(target, '0x000000000000aa27639a9bbf05a09ce31d93f987895deb1b3002fc50c914893e');
    });

    it('isValid', async function () {
        const bitcoinMergedMiningHeader = '0x00008020332a7135f993b5e6710934f4be6f51fa65fa68f85ddff0def2020000000000009ad29cc7781bd54cd5ac45450f867d8eec4afaa728dd2cbc2f3392a62ef74498581c5b5d9c50041a5d6a4b71';
        const difficulty = '423484912534602';
        const isValid = await this.helper.isValid(difficulty,bitcoinMergedMiningHeader);
        assert.equal(isValid, true);
        
        const gas = await this.helper.isValid.estimateGas(difficulty,bitcoinMergedMiningHeader);
        utils.checkGas(gas);
    });
    
    it('second isValid', async function () {
        const bitcoinMergedMiningHeader = '0x711101000000000000000000000000000000000000000000000000000000000000000000403ac00d7ab9e50ae959b7fb5e7f6d6962ea1bc360d56b10e73ea005d1a2795d11485c5dffff7f2133080000';
        const difficulty = '01';
        const isValid = await this.helper.isValid(difficulty,bitcoinMergedMiningHeader);
        assert.equal(isValid, true);
        
        const gas = await this.helper.isValid.estimateGas(difficulty,bitcoinMergedMiningHeader);
        utils.checkGas(gas);
    });

});