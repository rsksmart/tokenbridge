
const BlockRecorder = artifacts.require('./BlockRecorder.sol');

const expectThrow = require('./utils').expectThrow;

const block1 = "0xf90224a0fd45231c2e0021ddf741198d194ac0603a02a2b8f51eeea6ecb5209fb44e1101a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794ec4ddeb4380ad69b3e509baad9f158cdf4e4681da021c25b2dc4609a95ab510fb97aeabe450a53fdccdbb62ef50ea6946608c1a5a1a0a84b7e575405c273178035d3e9abe5d550761b6e8321c0d3dd58c4146dac25a6a0c93d7e93840d3c46a74c10e61a8afe3bef3e8d78ce1040f53c6c4178652cb1beb9010000000000000000000000000000000000000000002000000000200000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000100000080000000000000000000000000000080000000000000000000000000000000000000008000000000000000000000000000000000010000000000000000000000080000000100000020000000000000000000000000000001000000000020000000001000000000000018000000000000020000000000000200040100000000000000000000000000000000000000000000000000000000000000000000000018202de8367c28083055375845d5c481180800080b850711101000000000000000000000000000000000000000000000000000000000000000000403ac00d7ab9e50ae959b7fb5e7f6d6962ea1bc360d56b10e73ea005d1a2795d11485c5dffff7f2133080000";
const hash1 = "0xc4d15aa92e1eb489b383c52e0c52607ab7f62dc550d4f8d36d5da50031ff633d";
const number1 = 0x02de;
const difficulty1 = 1;
const trr1 = "0xc93d7e93840d3c46a74c10e61a8afe3bef3e8d78ce1040f53c6c4178652cb1be"
const mmr1 = "0x52cf50c7ef6bf8e5c04c95a9fc2de7b41eb9d5056991fb8462cd85bf2eac8a36";

const block2 = "0xf90221a034c9e19340a3e93d140d765effb840b67e7dde6668817e4845a51f89c80af3a9a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794ec4ddeb4380ad69b3e509baad9f158cdf4e4681da05465f2882d9e626acca7113abd36764d5df7cee933e42ea8e5429cdd3e92e100a052f88e25eecca4e1e50a9e57509fd98e9ebe62db58b2b7c852c12af3fe32a1a9a0f4071bb08b49311431dc312df5179c6b0bdb081b1017a107c8347c3931955d89b9010000000000000000000000000000000000000000002000000000200000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000100000080000000000000000000000000000080000000000000000000000000000000000000008000000000000000000000000000000000010000000000000000000000080000000100000020000000000000000000000000000001000000000020000000001000000000000018000000000000020000000000000200040100000000000000000000000000000000000000000000000000000000000000000000000018202dd8367c28080845d5c481080800080b850711101000000000000000000000000000000000000000000000000000000000000000000e52c7fe0e4bb5d1ab3ea788c59f96a25d84a6d90377dc0e86836cfb74d206c5110485c5dffff7f2129080000";
const hash2 = "0xfd45231c2e0021ddf741198d194ac0603a02a2b8f51eeea6ecb5209fb44e1101";
const number2 = 0x02dd;
const difficulty2 = 1;
const trr2 = "0xf4071bb08b49311431dc312df5179c6b0bdb081b1017a107c8347c3931955d89";

contract('BlockRecorder', function (accounts) {
    const mmrProver = accounts[1];
    
    beforeEach(async function () {
        this.recorder = await BlockRecorder.new(mmrProver);
    });
    
    it('retrieve unknown block data', async function () {
        const result = await this.recorder.blockData('0x01020304');
        assert.equal(result.number, 0);
    });
    
    it('record block', async function () {
        const data1 = Buffer.from(block1.substring(2), 'hex');
        const hash1b = web3.utils.sha3(data1);
        
        assert.equal(hash1b, hash1);
        
        await this.recorder.recordBlock(block1);
        
        const result = await this.recorder.blockData(hash1);
        
        assert.equal(result.number, number1);
        assert.equal(result.difficulty, difficulty1);
        assert.equal(result.receiptRoot, trr1);
        assert.equal(result.mmrProved, false);
    });
    
    it('record block 2', async function () {
        const data2 = Buffer.from(block2.substring(2), 'hex');
        const hash2b = web3.utils.sha3(data2);
        
        assert.equal(hash2b, hash2);
        
        await this.recorder.recordBlock(block2);
        
        const result = await this.recorder.blockData(hash2);
        
        assert.equal(result.number, number2);
        assert.equal(result.difficulty, difficulty2);
        assert.equal(result.receiptRoot, trr2);
        assert.equal(result.mmrProved, false);
    });
    
    it('mmr proved', async function () {
        await this.recorder.mmrProved(hash1, { from: mmrProver });
        
        const result = await this.recorder.blockData(hash1);
        
        assert.equal(result.number, 0);
        assert.equal(result.difficulty, 0);
        assert.equal(result.receiptRoot, 0);
        assert.equal(result.mmrProved, true);
    });
    
    it('only mmr prover can prove mmr', async function () {
        await expectThrow(this.recorder.mmrProved(hash1));
        
        const result = await this.recorder.blockData(hash1);
        
        assert.equal(result.number, 0);
        assert.equal(result.difficulty, 0);
        assert.equal(result.receiptRoot, 0);
        assert.equal(result.mmrProved, false);
    });
});

    

