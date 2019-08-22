
const ProofHelper = artifacts.require('./ProofHelper.sol');

contract('ProofLibrary', function (accounts) {
    beforeEach(async function () {
        this.helper = await ProofHelper.new();
    }); 
    
    it('check one prefix and sufix', async function () {
        const result = await this.helper.calculateRoot('0x0304', [ '0x0102' ], [ '0x0506' ]);
        
        const data = Buffer.from('010203040506', 'hex');
        const hash = web3.utils.sha3(data);
        
        assert.equal(result, hash);
    });
    
    it('check two prefixes and sufixes', async function () {
        const result = await this.helper.calculateRoot('0x0304', [ '0x01', '0x02' ], [ '0x05', '0x06' ]);
        
        const data1 = Buffer.from('01030405', 'hex');
        const hash1 = web3.utils.sha3(data1);
        const data2 = Buffer.from('02' + hash1.substring(2) + '06', 'hex');
        const hash = web3.utils.sha3(data2);
        
        assert.equal(result, hash);
    });
});

