
const BlockRecorder = artifacts.require('./BlockRecorder.sol');
const ReceiptProver = artifacts.require('./ReceiptProver.sol');
const SimpleTransferable = artifacts.require('./SimpleTransferable.sol');
const EventsProcessor = artifacts.require('./EventsProcessor.sol');

const utils = require('./utils');
const expectThrow = utils.expectThrow;
const calculatePrefixesSuffixes = utils.calculatePrefixesSuffixes;

const block = "0xf90223a00fea24b3ec3989b98b1b59609bb05c75eabcc75d94bc8fa1960d188e5e6b5b9fa01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794ec4ddeb4380ad69b3e509baad9f158cdf4e4681da0ee0ea88f557491f02218f0a432957285e79cc5b0c4945cbd023349a0d792d1b5a065f5aad31e6c17b3ff80a403fbac21d74b577fd8f22ca9c65b3961b4d3075ba5a0eba5c1ffa412f4b8dda8f6edebce02ccf2c53f7719465c35428b15c32622fa44b9010004000000000000000000000000004000000040002000000020200000000000000800000000000000000000000000000800000000000000000000000000800020000000000000004000004008000000000000100001000000000000000008100000080000800000000000000000000000080000000000080000000010000008000000000008000000000000000000000040000000800010004000800000000000000080000000100000024000000001000000000000000000001000000080038000000003000000000000018002000000002020000000000000200040100100040000000000000000000000000000000000000000000000000000000000000000018286178367c280829f4f845d67f1ea80800080b850711101000000000000000000000000000000000000000000000000000000000000000000c55aec1d0eabfdcbe7d25a77001864f3c263eaeff88d9c0436e0099c15d55648ebf1675dffff7f21dd000000"
const hash = "0xc7910b7ef29fb320fe9f7b15251ca09cbcf3f09e2510c25d1cd7b3bd30eec232";
const receipt = "0xf9035901829f4fb9010004000000000000000000000000004000000040000000000020000000000000000800000000000000000000000000000000000000000000000000000000800020000000000000004000004008000000000000100000000000000000000008000000000000800000000000000000000000000000000000080000000010000008000000000000000000000000000000000040000000800000004000800000000000000000000000000000004000000001000000000000000000000000000080018000000002000000000000000002000000002000000000000000000000000100040000000000000000000000000000000000000000000000000000000000000000f9024bf8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a0875d966eda6487c7c1a52ef9d6ec077de2fe63a903c4ed02db0d11f4528a001180f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd826a0000000000000000000000000cf7cdbbb5f7ba79d3ffe74a0bba13fc0295f6036a000000000000000000000000000000000000000000000000000000000000003e8f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000007986b3df570230288501eea3d890bd66948c9b79a000000000000000000000000039b12c05e8503356e3a7df0b7b33efa4c054c409a000000000000000000000000000000000000000000000000000000000000007d0f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000000a3aa774752ec2042c46548456c094a76c7f3a79a0000000000000000000000000c354d97642faa06781b76ffb6786f72cd7746c97a00000000000000000000000000000000000000000000000000000000000000bb8f8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a030beee9487f19272cea486f3940e1f4a5ce5d4f4fecb20dbf6979d63e695e5d780829f4f01"

const nodes = [
    "f9035901829f4fb9010004000000000000000000000000004000000040000000000020000000000000000800000000000000000000000000000000000000000000000000000000800020000000000000004000004008000000000000100000000000000000000008000000000000800000000000000000000000000000000000080000000010000008000000000000000000000000000000000040000000800000004000800000000000000000000000000000004000000001000000000000000000000000000080018000000002000000000000000002000000002000000000000000000000000100040000000000000000000000000000000000000000000000000000000000000000f9024bf8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a0875d966eda6487c7c1a52ef9d6ec077de2fe63a903c4ed02db0d11f4528a001180f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd826a0000000000000000000000000cf7cdbbb5f7ba79d3ffe74a0bba13fc0295f6036a000000000000000000000000000000000000000000000000000000000000003e8f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000007986b3df570230288501eea3d890bd66948c9b79a000000000000000000000000039b12c05e8503356e3a7df0b7b33efa4c054c409a000000000000000000000000000000000000000000000000000000000000007d0f89b9403f23ae1917722d5a27a2ea0bcc98725a2a2a49af863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000000a3aa774752ec2042c46548456c094a76c7f3a79a0000000000000000000000000c354d97642faa06781b76ffb6786f72cd7746c97a00000000000000000000000000000000000000000000000000000000000000bb8f8389403f23ae1917722d5a27a2ea0bcc98725a2a2a49ae1a030beee9487f19272cea486f3940e1f4a5ce5d4f4fecb20dbf6979d63e695e5d780829f4f01",
    "70060025db2f9d70f51eb8006858a37c3ec610fbd1c913d4521007af8c869b42d65e7400035c",
    "4f267006024ac502bc8c3d87c116cbbabb07d0a121ac18bbd258907de3c6b6ae9805a4878500038a2670060025db2f9d70f51eb8006858a37c3ec610fbd1c913d4521007af8c869b42d65e7400035cfd3207"                
];

contract('EventsProcessor', function (accounts) {
    const mmrProver = accounts[1];
    
    beforeEach(async function () {
        this.recorder = await BlockRecorder.new(mmrProver);
        const data = Buffer.from(block.substring(2), 'hex');
        await this.recorder.recordBlock(data);
        await this.recorder.mmrProved(hash, { from: mmrProver });
        this.prover = await ReceiptProver.new(this.recorder.address);
        this.transferable = await SimpleTransferable.new();
        this.processor = await EventsProcessor.new(this.prover.address, '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0xe10e7fce45693f4d605d212ac900b44fa162e7b2d4c7a475cc2f4e63c6987fed');
        await this.processor.setTransferable(this.transferable.address);
        await this.processor.setOrigin('0x03f23ae1917722d5a27a2ea0bcc98725a2a2a49a');
    });
    
    it('no transfers in transferable', async function () {
        const ntransfers = await this.transferable.ntransfers();
        
        assert.equal(ntransfers, 0);
    });
    
    it('receipt is valid', async function() {
        const data = Buffer.from(block.substring(2), 'hex');
        const hash = web3.utils.sha3(data);
        const prefsuf = calculatePrefixesSuffixes(nodes);
        
        const result = await this.prover.receiptIsValid(hash, receipt, prefsuf.prefixes, prefsuf.suffixes);
        
        assert.equal(result, true);
    });
    
    it('transfers in transferable after processing events', async function () {
        const prefsuf = calculatePrefixesSuffixes(nodes);
        const data = Buffer.from(block.substring(2), 'hex');
        const hash = web3.utils.sha3(data);
        
        let tx = await this.processor.processReceipt(hash, receipt, prefsuf.prefixes, prefsuf.suffixes);
        utils.checkRcpt(tx);

        const ntransfers = await this.transferable.ntransfers();
        
        assert.equal(ntransfers, 3);
        
        const token1 = await this.transferable.tokens(0);
        const token2 = await this.transferable.tokens(1);
        const token3 = await this.transferable.tokens(2);
        
        assert.equal(token1.toLowerCase(), '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826');
        assert.equal(token2.toLowerCase(), '0x7986b3df570230288501eea3d890bd66948c9b79');
        assert.equal(token3.toLowerCase(), '0x0a3aa774752ec2042c46548456c094a76c7f3a79');
        
        const receiver1 = await this.transferable.receivers(0);
        const receiver2 = await this.transferable.receivers(1);
        const receiver3 = await this.transferable.receivers(2);
        
        assert.equal(receiver1.toLowerCase(), '0xcf7cdbbb5f7ba79d3ffe74a0bba13fc0295f6036');
        assert.equal(receiver2.toLowerCase(), '0x39b12c05e8503356e3a7df0b7b33efa4c054c409');
        assert.equal(receiver3.toLowerCase(), '0xc354d97642faa06781b76ffb6786f72cd7746c97');
        
        const amount1 = await this.transferable.amounts(0);
        const amount2 = await this.transferable.amounts(1);
        const amount3 = await this.transferable.amounts(2);        
        
        assert.equal(amount1.toNumber(), 1000);
        assert.equal(amount2.toNumber(), 2000);
        assert.equal(amount3.toNumber(), 3000);
    });
    
    it('cannot process invalid receipt', async function () {
        const prefsuf = calculatePrefixesSuffixes(nodes);
        const data = Buffer.from(block.substring(2), 'hex');
        const hash = web3.utils.sha3(data);
        
        await expectThrow(this.processor.processReceipt(hash, receipt + '00', prefsuf.prefixes, prefsuf.suffixes));
    });
    
    it('cannot process receipt in non processed block', async function () {
        const prefsuf = calculatePrefixesSuffixes(nodes);
        const data = Buffer.from('01020304', 'hex');
        const hash = web3.utils.sha3(data);
        
        await expectThrow(this.processor.processReceipt(hash, receipt, prefsuf.prefixes, prefsuf.suffixes));
    });
    
    it('cannot process receipt twice', async function () {
        const prefsuf = calculatePrefixesSuffixes(nodes);
        const data = Buffer.from(block.substring(2), 'hex');
        const hash = web3.utils.sha3(data);
        
        let tx = await this.processor.processReceipt(hash, receipt, prefsuf.prefixes, prefsuf.suffixes);
        utils.checkRcpt(tx);

        const ntransfers = await this.transferable.ntransfers();
        
        assert.equal(ntransfers, 3);
        
        await this.processor.processReceipt(hash, receipt, prefsuf.prefixes, prefsuf.suffixes);
        
        const ntransfers2 = await this.transferable.ntransfers();
        
        assert.equal(ntransfers2, 3);
    });
});

