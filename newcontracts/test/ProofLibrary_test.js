
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
    
    it('check transaction receipt proof', async function () {
        const tr = '0xf9010e0183055375b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c08305537501';
        const prefixes = [ '0x', '0x4f267006029ca5b1da63038974cc58cb8feb6bfe3bfc138f1ffa24012dd3682b354295e7c900038b26700600' ];
        const sufixes = ['0x', '0x000111fde804'];
        const result = await this.helper.calculateRoot(tr, prefixes, sufixes);
        
        const data3 = Buffer.from('4f267006029ca5b1da63038974cc58cb8feb6bfe3bfc138f1ffa24012dd3682b354295e7c900038b267006004a79cce4182705422141f1a8477788a42360560b09e00032372c141eeac77c89000111fde804', 'hex');
        const hash3 = web3.utils.sha3(data3);
        
        assert.equal(result, hash3);
    });
});

