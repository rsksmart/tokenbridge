const expect = require('chai').expect;
const Web3 = require('web3');
const fs = require('fs');
const log4js = require('log4js');

const MMRController = require('../../src/lib/mmr/MMRController');
const MMRNode = require('../../src/lib/mmr/MMRNode.js');
const config = require('../../config');
const testHelper = require('../testHelper');

const logger = log4js.getLogger('test');
logger.level = 'info';

const rskWeb3 = new Web3(config.rsk.host);
const requiredConfirmations = config.mmrBlockConfirmations || 10;
const storagePath = `${__dirname}`;
let testConfig = { ...config, storagePath };
testConfig.eth.fromBlock = 0;
testConfig.rsk.fromBlock = 0;

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

describe('MMR Controller tests', () => {

    it.skip('Creates the mmr tree from rsk blocks', async (done) => { // Long process runing, skipped by default
        let mmrController = new MMRController(testConfig, logger);
        let lastBlock = await rskWeb3.eth.getBlockNumber();

        await mmrController.updateMMRTree();

        expect(mmrController.mmrTree).to.exist;

        let mmrRoot = mmrController.mmrTree.getRoot();
        expect(mmrRoot).to.exist;
        expect(mmrRoot.end_height).to.be.greaterThan(0);
        expect(mmrRoot.end_height).to.be.lte(lastBlock - requiredConfirmations);

        done();
    });

    it('Returns a list of promises from batch', async () => {
        let mmrController = new MMRController(testConfig, logger);
        let calls = [];
        testHelper.advanceBlock(rskWeb3);
        for (let i = 0; i < 2; i++) {
            calls.push({ fn: rskWeb3.eth.getBlock, blockNumber: i });
        }

        let batchResult = await mmrController._makeBatchRequest(calls);

        expect(batchResult.length).to.eq(2);
        batchResult.forEach((b, i) => {
            expect(b.number).to.eq(i);
        })
    });

    it('Gets the last block from mmr tree', () => {
        let mmrController = new MMRController({ ...testConfig, storagePath: ' ' }, logger);
        let empty = mmrController._getNextMMRBlock();

        expect(empty).to.eq(0);

        let node0 = MMRNode.fromBlock(block0);
        mmrController.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        mmrController.mmrTree._appendLeaf(node1);

        let last = mmrController._getNextMMRBlock();
        expect(last).to.eq(block1.number + 1);
    });

    it('Saves the current mmr tree', async () => {
        let mmrController = new MMRController(testConfig, logger);
        let path = `${storagePath}/mmrDB.json`;

        let node0 = MMRNode.fromBlock(block0);
        mmrController.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        mmrController.mmrTree._appendLeaf(node1);

        await mmrController.save();

        expect(fs.existsSync(path)).to.eq(true);
    });

    it('Restores the stored mmr tree', async () => {
        // Clear for next run
        let bakFile = `${testConfig.storagePath}/mmrDB.json`;
        if (fs.existsSync(bakFile)) {
            fs.truncateSync(bakFile, 0);
        }

        let mmrController = new MMRController(testConfig, logger);

        let node0 = MMRNode.fromBlock(block0);
        mmrController.mmrTree._appendLeaf(node0);

        let node1 = MMRNode.fromBlock(block1);
        mmrController.mmrTree._appendLeaf(node1);

        await mmrController.save();
        let mmrTree = mmrController._restoreMMRTree();

        let mmrRoot = mmrTree.getRoot();
        expect(mmrRoot.hash).to.exist;
        expect(mmrRoot.left.hash).to.equals(node0.hash);
        expect(mmrRoot.right.hash).to.equals(node1.hash);
    });
});
