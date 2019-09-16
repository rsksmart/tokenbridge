const expect = require('chai').expect;
const Web3 = require('web3');
const fs = require('fs');
const RskMMR = require('../../src/services/rsk/RskMMR');
const MMRNode = require('../../src/lib/mmr/MMRNode.js');
const config = require('../../config');

const rskWeb3 = new Web3(config.rsk.host);
const requiredConfirmations = config.mmrBlockConfirmations || 10;
const rskMMRStoragePath = `${__dirname}`;
let testConfig = { ...config, rskMMRStoragePath };

const block0 = {
    number: 131925,
    hash: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
    difficulty: '423484912534602',
    totalDifficulty: '11761856316565426264',
    timestamp: 1566252081
};
const block1 = {
    number: 131926,
    hash: '0xa636cbd79d6c94cd0c68ad90b6a90df0dbe610f0ad1fe643c8f07a12f332137d',
    difficulty: '423484912534603',
    totalDifficulty: '11761856316565426265',
    timestamp: 1566252082
};

describe('RskMMR tests', () => {

    it.skip('Creates the mmr tree from rsk blocks', async (done) => { // Long process runing, skipped by default
        let rskMMR = new RskMMR(testConfig, console);
        let lastBlock = await rskWeb3.eth.getBlockNumber();

        await rskMMR._updateMRRTree();

        expect(rskMMR.mmrTree).to.exist;

        let mmrRoot = rskMMR.mmrTree.getRoot();
        expect(mmrRoot).to.exist;
        expect(mmrRoot.end_height).to.be.greaterThan(0);
        expect(mmrRoot.end_height).to.be.lte(lastBlock - requiredConfirmations);

        done();
    });

    it('Returns a list of promises from batch', async () => {
        let rskMMR = new RskMMR(testConfig, console);
        let calls = [];
        for (let i = 0; i < 2; i++) {
            calls.push({ fn: rskWeb3.eth.getBlock, blockNumber: i });
        }

        let batchResult = await rskMMR._makeBatchRequest(calls);

        expect(batchResult.length).to.eq(2);
        batchResult.forEach((b, i) => {
            expect(b.number).to.eq(i);
        })
    });

    it('Gets the last block from mmr tree', () => {
        let rskMMR = new RskMMR({ ...testConfig, rskMMRStoragePath: '' }, console);
        let empty = rskMMR._getLastMMRBlock();

        expect(empty).to.eq(0);

        let node0 = MMRNode.fromBlock(block0);
        rskMMR.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        rskMMR.mmrTree._appendLeaf(node1);

        let last = rskMMR._getLastMMRBlock();
        expect(last).to.eq(block1.number);
    });

    it('Saves the current mmr tree', async () => {
        let rskMMR = new RskMMR(testConfig, console);
        let path = `${rskMMRStoragePath}/RskMMR.json`;

        let node0 = MMRNode.fromBlock(block0);
        rskMMR.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        rskMMR.mmrTree._appendLeaf(node1);

        rskMMR.exitHandler();

        expect(fs.existsSync(path)).to.eq(true);
    });

    it('Restores the stored mmr tree', async () => {
        // Clear for next run
        let bakFile = `${testConfig.rskMMRStoragePath}/RskMMR.json`;
        if (fs.existsSync(bakFile)) {
            fs.truncateSync(bakFile, 0);
        }

        let rskMMR = new RskMMR(testConfig, console);

        let node0 = MMRNode.fromBlock(block0);
        rskMMR.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        rskMMR.mmrTree._appendLeaf(node1);

        await rskMMR.exitHandler();
        let mmrTree = rskMMR._restoreMMRTree();

        let mmrRoot = mmrTree.getRoot();
        expect(mmrRoot.hash).to.exist;
        expect(mmrRoot.left.hash).to.equals(node0.hash);
        expect(mmrRoot.right.hash).to.equals(node1.hash);
    });
});
