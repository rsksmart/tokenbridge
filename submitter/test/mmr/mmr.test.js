const expect = require('chai').expect;
const ethUtils = require('ethereumjs-util');

const MMRTree = require('../../src/lib/mmr/MMRTree.js');
const MMRNode = require('../../src/lib/mmr/MMRNode.js');
const utils = require('../../src/lib/utils.js');

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
const block2 = { 
    number: 131927,
    hash: '0x4942664dda4ec02400fe22cf42ceca48fd732e58da60138683d8aaff3a25873c',
    difficulty: '423484912534604',
    totalDifficulty: '11761856316565426266',
    timestamp: 1566252083
};
const block3 = { 
    number: 131928,
    hash: '0x79c54f2563c22ff3673415087a7679adfa2c5f15a216e71e90601e1ca753f219',
    difficulty: '423484912534605',
    totalDifficulty: '11761856316565426267',
    timestamp: 1566252084
};
const block4 = { 
    number: 131929,
    hash: '0x3334efbd514c274bce5fc5be95215ba259e47c67d85193367315e32f6a4056e2',
    difficulty: '423484912534606',
    totalDifficulty: '11761856316565426268',
    timestamp: 1566252081
};

describe('MMR tests', () => {
    // Height
    // 3             8
    //              / \
    //             /   \
    //            /     \
    //           /       \
    // 2        6         \
    //        /   \        \  
    // 1     2     5        \ 
    //      / \   / \        \  
    // 0   0   1 3   4        7

    it('Hash correctly', () => {
        let hash = MMRNode.H(block0.hash, block1.hash);
        let expectedHash = ethUtils.bufferToHex(ethUtils.keccak256(block0.hash + utils.stripHexPrefix(block1.hash)));
        expect(expectedHash).to.equals(hash);
    });

    describe('Adding Blocks', () => {
        it('Single Block (1 node) MMR', () => {
            let mmr = new MMRTree();

            let node0 = MMRNode.fromBlock(block0);
            mmr.appendLeaf(node0);

            let mmrRoot = mmr.getRoot();
            expect(mmrRoot.hash).to.exist;
            expect(mmrRoot).to.equals(node0);
            expect(mmrRoot.start_height).to.equals(block0.number);
            expect(mmrRoot.end_height).to.equals(block0.number);
        });

        it('Two Blocks (3 nodes) MMR', () => {
            let mmr = new MMRTree();

            let node0 = MMRNode.fromBlock(block0);
            mmr.appendLeaf(node0);

            let node1 = MMRNode.fromBlock(block1);
            mmr.appendLeaf(node1);

            let mmrRoot = mmr.getRoot();
            expect(mmrRoot.hash).to.exist;
            expect(mmrRoot.left).to.equals(node0);
            expect(mmrRoot.right).to.equals(node1);
            let block0And2Hash = MMRNode.H(node0.hash, node1.hash);
            expect(mmrRoot.hash).to.equals(block0And2Hash);
            expect(mmrRoot.start_height).to.equals(block0.number);
            expect(mmrRoot.end_height).to.equals(block1.number);
        });

        it('Three Blocks (5 nodes) MMR', () => {
            let mmr = new MMRTree();

            let node0 = MMRNode.fromBlock(block0);
            mmr.appendLeaf(node0);
            let node1 = MMRNode.fromBlock(block1);
            mmr.appendLeaf(node1);
            let node3 = MMRNode.fromBlock(block2);
            mmr.appendLeaf(node3);

            let mmrRoot = mmr.getRoot();
            expect(mmrRoot.hash).to.exist;
            let block0And2Hash = MMRNode.H(node0.hash, node1.hash);
            expect(mmrRoot.left.hash).to.equals(block0And2Hash);
            expect(mmrRoot.right).to.equals(node3);
            
            expect(calculateNodeHeight(mmrRoot)).to.equals(2);
        });
        
        function calculateNodeHeight(node) {
            let height = 0;
            let aux = node;
            while(aux.left != null) {
                height++
                aux = aux.left;
            }
            return height;
        }

        it('Four Blocks (6 nodes) MMR', () => {
            let mmr = new MMRTree();

            let node0 = MMRNode.fromBlock(block0);
            mmr.appendLeaf(node0);
            let node1 = MMRNode.fromBlock(block1);
            mmr.appendLeaf(node1);
            let node3 = MMRNode.fromBlock(block2);
            mmr.appendLeaf(node3);
            let node4 = MMRNode.fromBlock(block3);
            mmr.appendLeaf(node4);

            let mmrRoot = mmr.getRoot();
            expect(mmrRoot.hash).to.exist;
            expect(calculateNodeHeight(mmrRoot)).to.equals(2);
            let block0And2Hash = MMRNode.H(node0.hash, node1.hash);
            let block2And5Hash = MMRNode.H(node3.hash, node4.hash);
            expect(mmrRoot.left.hash).to.equals(block0And2Hash);
            expect(mmrRoot.right.hash).to.equals(block2And5Hash); 
        });

        it('Five Blocks (8 nodes) MMR', () => {
            let mmr = new MMRTree();

            let node0 = MMRNode.fromBlock(block0);
            mmr.appendLeaf(node0);
            let node1 = MMRNode.fromBlock(block1);
            mmr.appendLeaf(node1);
            let node3 = MMRNode.fromBlock(block2);
            mmr.appendLeaf(node3);
            let node4 = MMRNode.fromBlock(block3);
            mmr.appendLeaf(node4);
            let node7 = MMRNode.fromBlock(block4);
            mmr.appendLeaf(node7);

            let mmrRoot = mmr.getRoot();
            expect(mmrRoot.hash).to.exist;
            expect(calculateNodeHeight(mmrRoot)).to.equals(3);
            let block0And2Hash = MMRNode.H(node0.hash, node1.hash);
            let block2And5Hash = MMRNode.H(node3.hash, node4.hash);
            let node6Hash = MMRNode.H(block0And2Hash, block2And5Hash);
            expect(mmrRoot.left.hash).to.equals(node6Hash);
            expect(mmrRoot.right).to.equals(node7); 
            expect(mmrRoot.hash).to.equals(MMRNode.H(node6Hash, node7.hash)); 
        });

    });

    describe('Merkle Proof', () => {
        beforeEach( () => {
            this.mmr = new MMRTree();

            this.node0 = MMRNode.fromBlock(block0);
            this.mmr.appendLeaf(this.node0);
            this.node1 = MMRNode.fromBlock(block1);
            this.mmr.appendLeaf(this.node1);
            this.node3 = MMRNode.fromBlock(block2);
            this.mmr.appendLeaf(this.node3);
            this.node4 = MMRNode.fromBlock(block3);
            this.mmr.appendLeaf(this.node4);
            this.node7 = MMRNode.fromBlock(block4);
            this.mmr.appendLeaf(this.node7);

            this.node2Hash = MMRNode.H(this.node0.hash, this.node1.hash);
            this.node5Hash = MMRNode.H(this.node3.hash, this.node4.hash);
            this.node6Hash = MMRNode.H(this.node2Hash, this.node5Hash);
          });

        it('Create Merkle Proof', () => {
            let merkleProof = this.mmr.getMerkleProof(block2.number);
            expect(merkleProof.length).to.equals(3);            
            expect(merkleProof[0]).to.equals(this.node4);
            expect(merkleProof[1].hash).to.equals(this.node2Hash);
            expect(merkleProof[2]).to.equals(this.node7);
        });

        it('Verify Merkle Proof', () => {
            let merkleProof = this.mmr.getMerkleProof(block2.number);
            let root = this.mmr.getRoot();
            let leafNumber = block2.number - root.start_height +1;
            let result = MMRTree.verifyMerkleProof(root.hash, root.leavesCount(), leafNumber, 
                block2, merkleProof);
            expect(result).to.equals(true);
        });
    });

    
});
