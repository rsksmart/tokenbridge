const RskPow = artifacts.require('./RskPow');

const utils = require('./utils');

contract('RskPow', async function () { 

    beforeEach(async function () {
        this.rskPow = await RskPow.new();
    });

    it('getBitcoinBlockHash', async function () {
        const bitcoinMergedMiningHeader = '0x00008020332a7135f993b5e6710934f4be6f51fa65fa68f85ddff0def2020000000000009ad29cc7781bd54cd5ac45450f867d8eec4afaa728dd2cbc2f3392a62ef74498581c5b5d9c50041a5d6a4b71';
        const bitcoinMergedMiningHeaderHash = await this.rskPow.getBitcoinBlockHash(bitcoinMergedMiningHeader);

        assert.equal(bitcoinMergedMiningHeaderHash, '0x00000000000047d69690cc3bb6b9eae7fd260437b79584b59fa46b014177ad65');
    });

    it('difficultyToTarget', async function () {
        const difficulty = '423484912534602';
        const target = await this.rskPow.difficultyToTarget(difficulty);
        assert.equal(target, '0x000000000000aa27639a9bbf05a09ce31d93f987895deb1b3002fc50c914893e');
    });

    it('isValid', async function () {
        const bitcoinMergedMiningHeader = '0x00008020332a7135f993b5e6710934f4be6f51fa65fa68f85ddff0def2020000000000009ad29cc7781bd54cd5ac45450f867d8eec4afaa728dd2cbc2f3392a62ef74498581c5b5d9c50041a5d6a4b71';
        const difficulty = '423484912534602';
        const isValid = await this.rskPow.isValid(difficulty,bitcoinMergedMiningHeader);
        assert.equal(isValid, true);
        
        const gas = await this.rskPow.isValid.estimateGas(difficulty,bitcoinMergedMiningHeader);
        utils.checkGas(gas);
    });

});