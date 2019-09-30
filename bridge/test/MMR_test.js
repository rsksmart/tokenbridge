
const MMR = artifacts.require('./MMR.sol');

const utils = require('./utils');
const MMRTree = require('../../submitter/src/lib/mmr/MMRTree');

let jsonrpcid = new Date().getTime();

// from https://ethereum.stackexchange.com/questions/11444/web3-js-with-promisified-api

const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }

      resolve(res);
    })
);

// https://medium.com/@contacttomnash/handy-helper-functions-for-solidity-development-with-truffle-39d14a371c12

const mineOneBlock = async () => {
  await promisify(cb => web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: jsonrpcid++
  }, cb))
};

contract('MMR', function (accounts) {
    beforeEach(async function () {
        this.mmr = await MMR.new();
    });
    
    it('create with initial values', async function() {
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 0);
        
        for (let k = 0; k < 64; k++) {
            const hash = await this.mmr.hashes(k);            
            assert.equal(hash, 0);
        }
    });

    it('compare with submitter MMR', async function() {        
        const mmrTree = new MMRTree();
        const initialBlock = await this.mmr.nblock();
        await mineOneBlock();
        await mineOneBlock();
        await mineOneBlock();

        const result = await this.mmr.calculate();
        utils.checkRcpt(result);
        assert.ok(result.logs);
        assert.equal(result.logs.length, 4);

        for (let k = 0; k < 4; k++) {
            assert.equal(result.logs[k].event, "MerkleMountainRange");
            assert.equal(result.logs[k].address, this.mmr.address);
            assert.equal(result.logs[k].args.noblock.toNumber(), initialBlock.toNumber() + k + 1);
            
            var block = await web3.eth.getBlock(initialBlock.toNumber() + k);
            mmrTree.appendBlock(block);
            assert.equal(mmrTree.getRoot().hash, result.logs[k].args.mmr);
        }
    });
    
    it('calculate first block', async function() {
        const initialBlock = await this.mmr.nblock();
        const result = await this.mmr.calculate();
        utils.checkRcpt(result);
        assert.ok(result.logs);
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].event, "MerkleMountainRange");
        assert.equal(result.logs[0].address, this.mmr.address);
        assert.equal(result.logs[0].args.noblock.toNumber(), initialBlock.toNumber() + 1);
        
        const newBlock = await this.mmr.nblock();
        assert.equal(newBlock.toNumber(), initialBlock.toNumber() + 1);
        
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 1);
        
        const nhash = await this.mmr.nhash();
        assert.notEqual(nhash, 0);
        assert.equal(result.logs[0].args.blockhash, nhash);
        assert.equal(result.logs[0].args.mmr, nhash);
        
        const hash = await this.mmr.hashes(0);        
        assert.notEqual(hash, 0);
        
        for (let k = 1; k < 64; k++) {
            const hash = await this.mmr.hashes(k);
            assert.equal(hash, 0);
        }
    });
    
    it('calculate two blocks', async function() {
        const initialBlock = await this.mmr.nblock();
        await this.mmr.calculate();

        const result = await this.mmr.calculate();
        utils.checkRcpt(result);
        assert.ok(result.logs);
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].event, "MerkleMountainRange");
        assert.equal(result.logs[0].address, this.mmr.address);
        assert.equal(result.logs[0].args.noblock.toNumber(), initialBlock.toNumber() + 2);

        const newBlock = await this.mmr.nblock();
        
        assert.equal(newBlock.toNumber(), initialBlock.toNumber() + 2);
        
        const nhashes = await this.mmr.nhashes();
        assert.equal(nhashes, 2);

        const nhash = await this.mmr.nhash();
        assert.notEqual(nhash, 0);
        assert.equal(result.logs[0].args.mmr, nhash);

        const hash = await this.mmr.hashes(0);        
        assert.equal(hash, 0);
        
        const hash2 = await this.mmr.hashes(1);
        assert.notEqual(hash2, 0);
        
        for (let k = 2; k < 64; k++) {
            const hash = await this.mmr.hashes(k);
            assert.equal(hash, 0);
        }
    });
    
    it('calculate 32 blocks', async function() {
        await calculateAndCheckNBlocks(32, this.mmr);
    });

    it('Calculate with 64', async function() {          
        await calculateAndCheckNBlocks(64, this.mmr);
    });

    it('Calculate  with 128 blocks', async function() {
        const initialBlock = await this.mmr.nblock();        
        await calculateAndCheckNBlocks(128, this.mmr);
    });

    it.only('Max blocks to calculate (150)', async function() {  
        await calculateAndCheckNBlocks(150, this.mmr);
    });

    async function calculateAndCheckNBlocks(numberOfBlocks, mmr) {
        const initialBlock = await mmr.nblock();  
        const mmrTree = new MMRTree();
        const minedBlocks = numberOfBlocks;
        for(var i = 0; i < minedBlocks; i++) {
            await mineOneBlock();
        }

        const result = await mmr.calculate();
        utils.checkRcpt(result);
        assert.ok(result.logs);
        assert.equal(result.logs.length, minedBlocks + 1);

        for (let k = 0; k < minedBlocks +1; k++) {
            assert.equal(result.logs[k].event, "MerkleMountainRange");
            assert.equal(result.logs[k].address, mmr.address);
            assert.equal(result.logs[k].args.noblock.toNumber(), initialBlock.toNumber() + k + 1);
            
            var block = await web3.eth.getBlock(initialBlock.toNumber() + k);
            mmrTree.appendBlock(block);
            assert.equal(mmrTree.getRoot().hash, result.logs[k].args.mmr);
        }
    }
});

