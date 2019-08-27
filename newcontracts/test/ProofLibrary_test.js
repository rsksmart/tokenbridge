
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
    
    it('check transaction receipt proof calculating prefixes, suffixes', async function () {
        // these nodes should have no '0x' prefix
        const nodes = [
            "f9010e0183055375b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c08305537501",
            "7006004a79cce4182705422141f1a8477788a42360560b09e00032372c141eeac77c89000111",
            "4f267006029ca5b1da63038974cc58cb8feb6bfe3bfc138f1ffa24012dd3682b354295e7c900038b267006004a79cce4182705422141f1a8477788a42360560b09e00032372c141eeac77c89000111fde804"            
        ];
        
        const prefsuf = calculatePrefixesSuffixes(nodes);
        
        const result = await this.helper.calculateRoot('0x' + nodes[0], prefsuf.prefixes, prefsuf.suffixes);
        
        const data3 = Buffer.from(nodes[2], 'hex');
        const hash3 = web3.utils.sha3(data3);
        
        assert.equal(result, hash3);
    });
});

function calculatePrefixesSuffixes(nodes) {
    const prefixes = [];
    const suffixes = [];
    const ns = [];
    
    for (let k = 0, l = nodes.length; k < l; k++) {
        if (k + 1 < l && nodes[k+1].indexOf(nodes[k]) >= 0)
            continue;
        
        ns.push(nodes[k]);
    }
    
    let hash = web3.utils.sha3(Buffer.from(ns[0], 'hex'));
    
    if (hash.substring(0, 2).toLowerCase() === '0x')
        hash = hash.substring(2);
    
    prefixes.push('0x');
    suffixes.push('0x');
    
    for (let k = 1, l = ns.length; k < l; k++) {
        const p = ns[k].indexOf(hash);
        
        prefixes.push('0x' + ns[k].substring(0, p));
        suffixes.push('0x' + ns[k].substring(p + hash.length));
        
        hash = web3.utils.sha3(Buffer.from(ns[k], 'hex'));
        
        if (hash.substring(0, 2).toLowerCase() === '0x')
            hash = hash.substring(2);
    }
    
    return { prefixes: prefixes, suffixes: suffixes };
}

