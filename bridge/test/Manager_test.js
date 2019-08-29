const Manager = artifacts.require('./Manager');
const Verifier = artifacts.require('./Verifier');
const Bridge = artifacts.require('./Bridge');

const utils = require('./utils');

contract('Manager', async function (accounts) {    
    const managerOwner = accounts[0];
    const verifierOwner = accounts[1];
    const bridgeOwner = accounts[2];
    const anAccount = accounts[3];

    beforeEach(async function () {
        this.verifier = await Verifier.new({ from: verifierOwner });
        this.manager = await Manager.new(this.verifier.address, { from: managerOwner });
        this.bridge = await Bridge.new(this.manager.address, 'r'.charCodeAt(), { from: bridgeOwner });
        await this.manager.setTransferable(this.bridge.address, { from: managerOwner });
    });
    describe('transferable', async function () {
        it('get transferable', async function () {
            const transferable = await this.manager.transferable();

            assert.equal(transferable, this.bridge.address);
        });

        it('only manager can change transferable', async function () {
            await utils.expectThrow(this.manager.transferable(anAccount));
            
            const transferable = await this.manager.transferable();
            assert.equal(transferable, this.bridge.address);
        });
    });

    it('getTransactionId', async function () {
        const blockNumber = 131925;
        const blockHash = '0x79c54f2563c22ff3673415087a7679adfa2c5f15a216e71e90601e1ca753f219';
        const txReceiptHash = '0xa636cbd79d6c94cd0c68ad90b6a90df0dbe610f0ad1fe643c8f07a12f332137d';

        const id = await this.manager.getTransactionId(blockNumber, blockHash, txReceiptHash);

        result = "0x475ba1f6ff5d3372be7236684ce44447989d2a466f83963692d4e84584a58966";
        assert.equal(id, result);
    });

    describe('processCrossEvent', async function () {
        beforeEach(async function () {
            this.rawBlockHeader = '0xf90236a03334efbd514c274bce5fc5be95215ba259e47c67d85193367315e32f6a4056e2a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479442c0444f96f2716c0b77548aca74ec32a00aeb8da000772ea8c3b1038126fabb43928f1b24633547d6d1256f6c392924933feeb025a00b0d510c141b3d883eb29fc8b4602108968a0ca1a417d65292c81460a3a8ca50a0a1fbeb06a8181596e79aff36a3671ff3e506659d4b2953b157824a503fa85f37b90100000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000040040000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000002000000000000000000000004000000000000000000000000080000040000000000000000000020000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000008701812843c7844a830203558367c28083018d28845d5b1c318086061a6025b400840387ee4080b85000008020332a7135f993b5e6710934f4be6f51fa65fa68f85ddff0def2020000000000009ad29cc7781bd54cd5ac45450f867d8eec4afaa728dd2cbc2f3392a62ef74498581c5b5d9c50041a5d6a4b71';
            this.rawTxReceipt = '0xf901ac0183018d28b9010000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000004004000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000400000000000000000000000008000004000000000000000000002000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000f89df89b945a323a9c4c0fd6a521426dd0ebced8318a9835ebf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000002cf9ae9947538119afd0a246d3ac87dcc8112e05a0000000000000000000000000170346689cc312d8e19959bc68c3ad03e72c9850a00000000000000000000000000000000000000000000000000de0b6b3a764000083018d2801';
            this.rawTxReceiptNodes = '0xf87ba6700600bcf2af38a629524d82e49ab8798af8b74a8f1278fd622bb482454673e884dbab0001afb8524f2670060248413a7ca4358b3ce7ab8be76ce0d5af1e32f093236acc234adc99d9ae1620e700010e26700600bcf2af38a629524d82e49ab8798af8b74a8f1278fd622bb482454673e884dbab0001affd0903';

            this.blockNumber = 131925;
            this.blockHash = '0x79c54f2563c22ff3673415087a7679adfa2c5f15a216e71e90601e1ca753f219';
            this.txReceiptHash = '0xa636cbd79d6c94cd0c68ad90b6a90df0dbe610f0ad1fe643c8f07a12f332137d';
        });

        it('should be sucessful', async function () {
            let tx = await this.manager.processCrossEvent(this.rawBlockHeader, this.rawTxReceipt, this.rawTxReceiptNodes, { from: anAccount });
            utils.checkRcpt(tx);

            let hash = await this.manager.lastBlockHash(anAccount);
            assert.equal(hash, this.blockHash);
            
            let lastBlockNumber = await this.manager.lastBlockNumber(anAccount);
            assert.equal(lastBlockNumber, this.blockNumber);

            result = await this.manager.transactionWasProcessed(this.blockNumber, this.blockHash, this.txReceiptHash);
            assert.ok(result);        
        });

        it('should return false on already processed', async function () {
            let tx = await this.manager.processCrossEvent(this.rawBlockHeader, this.rawTxReceipt, this.rawTxReceiptNodes, { from: anAccount });
            assert.ok(tx);

            let result = await this.manager.transactionWasProcessed(this.blockNumber, this.blockHash, this.txReceiptHash);
            assert.ok(result);

            result = await this.manager.processCrossEvent.call(this.rawBlockHeader, this.rawTxReceipt, this.rawTxReceiptNodes, { from: anAccount });
            assert.isNotOk(result);
        });

    });

});