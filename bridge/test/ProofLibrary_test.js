
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
    
    it('check transaction receipt 2 proof calculating prefixes, suffixes', async function () {
        // these nodes should have no '0x' prefix
        const nodes = [
            "f9035901829f4fb9010004000000000000000000000000004000000040000000000020000000000000000800000000000000000000000000000000000000000000000000000000800020000000000000004000004008000000000000100000000000000000000008000000000000800000000000000000000000000000000000080000000010000008000000000000000000000000000000000040000000800000004000800000000000000000000000000000004000000001000000000000000000000000000080018000000002000000000000000002000000002000000000000000000000000100040000000000000000000000000000000000000000000000000000000000000000f9024bf8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a0875d966eda6487c7c1a52ef9d6ec077de2fe63a903c4ed02db0d11f4528a001180f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd826a0000000000000000000000000cf7cdbbb5f7ba79d3ffe74a0bba13fc0295f6036a000000000000000000000000000000000000000000000000000000000000003e8f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000007986b3df570230288501eea3d890bd66948c9b79a000000000000000000000000039b12c05e8503356e3a7df0b7b33efa4c054c409a000000000000000000000000000000000000000000000000000000000000007d0f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000000a3aa774752ec2042c46548456c094a76c7f3a79a0000000000000000000000000c354d97642faa06781b76ffb6786f72cd7746c97a00000000000000000000000000000000000000000000000000000000000000bb8f8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a030beee9487f19272cea486f3940e1f4a5ce5d4f4fecb20dbf6979d63e695e5d780829f4f01",
            "70060025db2f9d70f51eb8006858a37c3ec610fbd1c913d4521007af8c869b42d65e7400035c",
            "4f267006024ac502bc8c3d87c116cbbabb07d0a121ac18bbd258907de3c6b6ae9805a4878500038a2670060025db2f9d70f51eb8006858a37c3ec610fbd1c913d4521007af8c869b42d65e7400035cfd3207"
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

