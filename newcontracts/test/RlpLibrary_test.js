
const RlpHelper = artifacts.require('./RlpHelper.sol');

const rlp = require('rlp');

const block1 = "0xf902c3a0fd45231c2e0021ddf741198d194ac0603a02a2b8f51eeea6ecb5209fb44e1101a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794ec4ddeb4380ad69b3e509baad9f158cdf4e4681da021c25b2dc4609a95ab510fb97aeabe450a53fdccdbb62ef50ea6946608c1a5a1a0a84b7e575405c273178035d3e9abe5d550761b6e8321c0d3dd58c4146dac25a6a0c93d7e93840d3c46a74c10e61a8afe3bef3e8d78ce1040f53c6c4178652cb1beb9010000000000000000000000000000000000000000002000000000200000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000100000080000000000000000000000000000080000000000000000000000000000000000000008000000000000000000000000000000000010000000000000000000000080000000100000020000000000000000000000000000001000000000020000000001000000000000018000000000000020000000000000200040100000000000000000000000000000000000000000000000000000000000000000000000018202de8367c28083055375845d5c481180800080b850711101000000000000000000000000000000000000000000000000000000000000000000403ac00d7ab9e50ae959b7fb5e7f6d6962ea1bc360d56b10e73ea005d1a2795d11485c5dffff7f213308000080b89c000000000000038042c3045d1e30811b50d0c760be51881c3140f572483241cc68e04ab4f5c2b87b5452b1c314def86de8f4e44ccd4c5c465040a71bcc3552534b424c4f434b3a3727dd035222a734fb40fb2f579656b50923fd7f3951e98fd83eea00000002deffffffff0100f2052a010000002321027df2212cf17341a3bd9b32364263fcd1f0cf7dff7c087dbb841ba725f04120ddac00000000";
const block2 = "0xf902d9a034c9e19340a3e93d140d765effb840b67e7dde6668817e4845a51f89c80af3a9a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794ec4ddeb4380ad69b3e509baad9f158cdf4e4681da05465f2882d9e626acca7113abd36764d5df7cee933e42ea8e5429cdd3e92e100a052f88e25eecca4e1e50a9e57509fd98e9ebe62db58b2b7c852c12af3fe32a1a9a0f4071bb08b49311431dc312df5179c6b0bdb081b1017a107c8347c3931955d89b9010000000000000000000000000000000000000000002000000000200000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000100000080000000000000000000000000000080000000000000000000000000000000000000008000000000000000000000000000000000010000000000000000000000080000000100000020000000000000000000000000000001000000000020000000001000000000000018000000000000020000000000000200040100000000000000000000000000000000000000000000000000000000000000000000000018202dd8367c28080845d5c481080800080b850711101000000000000000000000000000000000000000000000000000000000000000000e52c7fe0e4bb5d1ab3ea788c59f96a25d84a6d90377dc0e86836cfb74d206c5110485c5dffff7f212908000080b8b50000000000000140ccb2919e38a701c6e4710130fdd8edcb6e3732b5d077f6bb1565a8ead1f08398601be62ea9b3d21fe6c02e45e32c2eb907cdf0b4e0e0a4699440638be9782024be14c07e6a9e27bbe8f2f1f1efce0652534b424c4f434b3abfaa4784c91bb100ad846f5e5f4fe67694513d7f3951e98fd83eea00000002ddffffffff0100f2052a01000000232102c87cc0e7ec192a98568857768bf1654e75d6cd0b60fcb26693577ad30abcf4d5ac00000000";
const receipt1 = "0xf9010e0183055375b9010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c08305537501";

function concat(str1, str2) {
    if (str1.startsWith('0x'))
        str1 = str1.substring(2);
    if (str2.startsWith('0x'))
        str2 = str2.substring(2);
    
    return '0x' + str1 + str2;
}

function toHexString(buffer) {
    const text = buffer.toString('hex');
    
    if (text.startsWith('0x'))
        return text;
    
    return '0x' + text;
}

contract('RlpLibrary', function (accounts) {
    beforeEach(async function () {
        this.helper = await RlpHelper.new();
    });
    
    it('get RLP item from encoded empty array', async function () {
        const data = rlp.encode('');
        const str = toHexString(data);

        const result = await this.helper.getRlpItem(str, 0);
        
        assert.equal(result.itemOffset, 1);
        assert.equal(result.itemLength, 0);
    });

    it('get RLP item with one byte', async function () {
        const data = rlp.encode('a');
        const str = toHexString(data);

        const result = await this.helper.getRlpItem(str, 0);
        
        assert.equal(result.itemOffset, 0);
        assert.equal(result.itemLength, 1);
    });
    
    it('get RLP item with two bytes', async function () {
        const data = rlp.encode('aa');
        const str = toHexString(data);

        const result = await this.helper.getRlpItem(str, 0);
        
        assert.equal(result.itemOffset, 1);
        assert.equal(result.itemLength, 2);
    });
    
    it('get RLP item with 56 bytes', async function () {
        let message = '1234567';
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 56);
        
        const data = rlp.encode(message);
        const str = toHexString(data);

        const result = await this.helper.getRlpItem(str, 0);
        
        assert.equal(result.itemOffset, 2);
        assert.equal(result.itemLength, 56);
    });
    
    it('get RLP item with 1024 bytes', async function () {
        let message = '01234567';
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 1024);
        
        const data = rlp.encode(message);
        const str = toHexString(data);

        const result = await this.helper.getRlpItem(str, 0);
        
        assert.equal(result.itemOffset, 3);
        assert.equal(result.itemLength, 1024);
    });
    
    it('get RLP item with 1024 bytes using offset', async function () {
        let message = '01234567';
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 1024);
        
        const data = rlp.encode(message);
        const str = concat('0x010203', toHexString(data));

        const result = await this.helper.getRlpItem(str, 3);
        
        assert.equal(result.itemOffset, 6);
        assert.equal(result.itemLength, 1024);
    });

    it('get total length 1 from encoded empty array', async function () {
        const data = rlp.encode('');
        const str = toHexString(data);
        const result = await this.helper.getRlpTotalLength(str, 0);
        
        assert.equal(result, 1);
    });
    
    it('get total length 1 from encoded empty array using offset', async function () {
        const data = rlp.encode('');
        const str = concat('0102', toHexString(data));
        const result = await this.helper.getRlpTotalLength(str, 2);
        
        assert.equal(result, 1);
    });
    
    it('get total length 1', async function () {
        const data = rlp.encode('a');
        const str = toHexString(data);
        const result = await this.helper.getRlpTotalLength(str, 0);
        
        assert.equal(result, 1);
    });
    
    it('get total length 1 using offset', async function () {
        const data = rlp.encode('');
        const str = concat('0102', toHexString(data));
        const result = await this.helper.getRlpTotalLength(str, 2);
        
        assert.equal(result, 1);
    });
    
    it('get length 0', async function () {
        const result = await this.helper.getRlpLength('0x80', 0);
        
        assert.equal(result, 0);
    });
    
    it('get length 0 using offset', async function () {
        const result = await this.helper.getRlpLength('0x010280', 2);
        
        assert.equal(result, 0);
    });
    
    it('get length 1', async function () {
        const result = await this.helper.getRlpLength('0x01', 0);
        
        assert.equal(result, 1);
    });
    
    it('get length 1 using offset', async function () {
        const result = await this.helper.getRlpLength('0x800203', 2);
        
        assert.equal(result, 1);
    });
    
    it('process encoded empty array', async function() {
        const data = rlp.encode('');
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, 0);
        assert.equal(tlength, 1);
        assert.equal(offset, 1);
    });
    
    it('process encoded one byte array', async function() {
        const data = rlp.encode('a');
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, 1);
        assert.equal(tlength, 1);
        assert.equal(offset, 0);
    });
    
    it('process encoded two byte array', async function() {
        const data = rlp.encode('ab');
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, 2);
        assert.equal(tlength, 3);
        assert.equal(offset, 1);
    });
    
    it('process encoded 56 bytes array', async function() {
        let message = '1234567';
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 56);
        
        const data = rlp.encode(message);
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, message.length);
        assert.equal(tlength, message.length + 2);
        assert.equal(offset, 2);
    });
    
    it('process encoded 1024 bytes array', async function() {
        let message = '01234567';
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 1024);
        
        const data = rlp.encode(message);
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, message.length);
        assert.equal(tlength, message.length + 3);
        assert.equal(offset, 3);
    });
    
    it('process encoded 256*256 bytes array', async function() {
        let message = '01234567';
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        message += message;
        
        assert.equal(message.length, 256 * 256);
        
        const data = rlp.encode(message);
        const str = toHexString(data);
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, message.length);
        assert.equal(tlength, message.length + 4);
        assert.equal(offset, 4);
    });
    
    it('process encoded 2*256*256 bytes array', async function() {        
        const str = '0xba020000';
        
        const length = await this.helper.getRlpLength(str, 0);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        const offset = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(length, 2 * 256 * 256);
        assert.equal(tlength, 2 * 256 * 256 + 4);
        assert.equal(offset, 4);
    });
    
    it('get total length simple list with two short items', async function () {
        const data = rlp.encode(['a', 'b']);
        const str = toHexString(data);

        const result = await this.helper.getRlpTotalLength(str, 0);
        
        assert.equal(result, 3);
    });
    
    it('get length simple list with two short items', async function () {
        const data = rlp.encode(['a', 'b']);
        const str = toHexString(data);

        const result = await this.helper.getRlpLength(str, 0);
        
        assert.equal(result, 2);
    });
    
    it('get offset simple list with two short items', async function () {
        const data = rlp.encode(['a', 'b']);
        const str = toHexString(data);

        const result = await this.helper.getRlpOffset(str, 0);
        
        assert.equal(result, 1);
        
        const nitems = await this.helper.getRlpNumItems(str, 0);
        
        assert.equal(nitems, 2);
    });
    
    
    it('process list with one tiny item', async function () {
        let text = "0123456789";
        
        const data = rlp.encode([text]);
        const str = toHexString(data);
        
        const offset = await this.helper.getRlpOffset(str, 0);
        assert.equal(offset, 1);
        const length = await this.helper.getRlpLength(str, 0);
        assert.equal(length, 11);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        assert.equal(tlength, 12);
        
        const nitems = await this.helper.getRlpNumItems(str, 0);
        
        assert.equal(nitems, 1);
    });

    it('process list with one short item', async function () {
        let text = "0123456789";
        text += text;
        text += text;
        text += "01234567890123";
        
        const data = rlp.encode([text]);
        const str = toHexString(data);
        
        const offset = await this.helper.getRlpOffset(str, 0);
        assert.equal(offset, 1);
        const length = await this.helper.getRlpLength(str, 0);
        assert.equal(length, 55);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        assert.equal(tlength, 56);
        
        const nitems = await this.helper.getRlpNumItems(str, 0);
        
        assert.equal(nitems, 1);
    });
    
    it('process list with one not so short item', async function () {
        let text = "0123456789";
        text += text;
        text += text;
        text += "012345678901234";
        
        const data = rlp.encode([text]);
        const str = toHexString(data);
        
        const offset = await this.helper.getRlpOffset(str, 0);
        assert.equal(offset, 2);
        const length = await this.helper.getRlpLength(str, 0);
        assert.equal(length, 56);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        assert.equal(tlength, 58);
        
        const nitems = await this.helper.getRlpNumItems(str, 0);
        
        assert.equal(nitems, 1);
        
        const items = await this.helper.getRlpItems(str, 0);
        
        assert.equal(items.offsets[0], 3);
        assert.equal(items.lengths[0], 55);
    });
    
    it('process list with two not so short items', async function () {
        let text = "0123456789";
        text += text;
        text += text;
        text += "012345678901234";
        
        const data = rlp.encode([text, text]);
        const str = toHexString(data);
        
        const offset = await this.helper.getRlpOffset(str, 0);
        assert.equal(offset, 2);
        const length = await this.helper.getRlpLength(str, 0);
        assert.equal(length, 56 * 2);
        const tlength = await this.helper.getRlpTotalLength(str, 0);
        assert.equal(tlength, 56 * 2 + 2);
        
        const nitems = await this.helper.getRlpNumItems(str, 0);
        
        assert.equal(nitems, 2);
        
        const items = await this.helper.getRlpItems(str, 0);
        
        assert.equal(items.offsets[0], 3);
        assert.equal(items.lengths[0], 55);
        assert.equal(items.offsets[1], 3 + 56);
        assert.equal(items.lengths[1], 55);
    });
    
    it('process list with two not so short items using offset', async function () {
        let text = "0123456789";
        text += text;
        text += text;
        text += "012345678901234";
        
        const data = rlp.encode([text, text]);
        const str = concat('0x010203', toHexString(data));
        
        const offset = await this.helper.getRlpOffset(str, 3);
        assert.equal(offset, 2 + 3);
        const length = await this.helper.getRlpLength(str, 3);
        assert.equal(length, 56 * 2);
        const tlength = await this.helper.getRlpTotalLength(str, 3);
        assert.equal(tlength, 56 * 2 + 2);
        
        const nitems = await this.helper.getRlpNumItems(str, 3);
        
        assert.equal(nitems, 2);
        
        const items = await this.helper.getRlpItems(str, 3);
        
        assert.equal(items.offsets[0], 3 + 3);
        assert.equal(items.lengths[0], 55);
        assert.equal(items.offsets[1], 3 + 56 + 3);
        assert.equal(items.lengths[1], 55);
    });

    it('get items from block1', async function () {
        const str = block1;
        
        const nitems = (await this.helper.getRlpNumItems(str, 0)).toNumber();

        assert.equal(nitems, 19);
        
        const items = await this.helper.getRlpItems(str, 0);
        
        for (let k = 0; k < nitems; k++) {
            const offset = items.offsets[k].toNumber();
            const length = items.lengths[k].toNumber();
            
            const p = offset * 2 + 2;
            const l = p + length * 2;
            
            console.log(k, ':', str.substring(p, l));
        }
    });
    
    it('get items from block2', async function () {
        const str = block2;
        
        const nitems = (await this.helper.getRlpNumItems(str, 0)).toNumber();

        assert.equal(nitems, 19);
        
        const items = await this.helper.getRlpItems(str, 0);
        
        for (let k = 0; k < nitems; k++) {
            const offset = items.offsets[k].toNumber();
            const length = items.lengths[k].toNumber();
            
            const p = offset * 2 + 2;
            const l = p + length * 2;
            
            console.log(k, ':', str.substring(p, l));
        }
    });
    
    it('get items from receipt1', async function () {
        const str = receipt1;
        
        const nitems = (await this.helper.getRlpNumItems(str, 0)).toNumber();

        //assert.equal(nitems, 19);
        
        const items = await this.helper.getRlpItems(str, 0);
        
        for (let k = 0; k < nitems; k++) {
            const offset = items.offsets[k].toNumber();
            const length = items.lengths[k].toNumber();
            
            const p = offset * 2 + 2;
            const l = p + length * 2;
            
            console.log(k, ':', str.substring(p, l));
        }
    });
});

