
const MMRProver = artifacts.require('./MMRProver.sol');
const BlockRecorder = artifacts.require('./BlockRecorder.sol');

const utils = require('./utils');

function generateRandomHexaByte() {
    let n = Math.floor(Math.random() * 255).toString(16);
    
    while (n.length < 2)
        n = '0' + n;
    
    return n;
}

function generateRandomHash() {
    let keytxt = '';
    
    for (var k = 0; k < 32; k++)
        keytxt += generateRandomHexaByte();
    
    return Buffer.from(keytxt, 'hex');
}

function toBuffer(node) {
    if (node.hash)
        return node.hash;
    
    return node;
}

function calculateNode(left, right) {
    const bleft = toBuffer(left);
    const bright = toBuffer(right);
    
    const hash = web3.utils.sha3(Buffer.concat([ bleft, bright ]));
    const bhash = Buffer.from(hash.substring(2), 'hex');
    
    return { left: left, right: right, hash: bhash };
}

function makeProof(nodes) {
    const l = nodes.length;
    const prefixes = [];
    const suffixes = [];
    
    for (let k = 0; k < l - 1; k++)
        if (nodes[k].left === nodes[k + 1]) {
            prefixes.unshift('0x');
            suffixes.unshift(toBuffer(nodes[k].right));
        }
        else {
            prefixes.unshift(toBuffer(nodes[k].left));
            suffixes.unshift('0x');
        }
        
    return { prefixes: prefixes, suffixes: suffixes };
}

function makeTree(leafs) {
    const l = leafs.length;
    
    if (l === 1)
        return leafs[0];
    
    const newleafs = [];
    
    for (let k = 0; k < l - 1; k += 2)
        newleafs.push(calculateNode(leafs[k], leafs[k + 1]));
    
    if (l % 2)
        newleafs.push(leafs[l - 1]);

    return makeTree(newleafs);
}

function makePaths(tree, paths, path) {
    if (!tree.left) {
        path.push(tree);
        paths.push(path);
        
        return;
    }

    path.push(tree);
    
    const lpath = path.slice();
    makePaths(tree.left, paths, lpath);
    
    const rpath = path.slice();
    makePaths(tree.right, paths, rpath);
}

async function processTree(nnodes, prover) {
    const nodes = [];
    
    for (let k = 0; k < nnodes; k++)
        nodes.push(generateRandomHash());
    
    const tree = makeTree(nodes);

    const paths = [];
    makePaths(tree, paths, []);
    
    assert.equal(paths.length, nnodes);
    
    for (let k = 0; k < nnodes; k++) {
        const proof = makeProof(paths[k]);
        const result = await prover.mmrIsValid(tree.hash, nodes[k], proof.prefixes, proof.suffixes); 
        assert.ok(result);
    }
}

contract('MMRProver', function (accounts) {
    beforeEach(async function () {
        this.prover = await MMRProver.new();
        this.recorder = await BlockRecorder.new(this.prover.address);
        
        await this.prover.setBlockRecorder(this.recorder.address);
    });
    
    it('prove tree with two nodes', async function () {
        const node1 = generateRandomHash();
        const node2 = generateRandomHash();
        const inode1 = calculateNode(node1, node2);
        
        const result = await this.prover.mmrIsValid(inode1.hash, node1, [ '0x' ], [ node2 ]);
        
        assert.ok(result);
    });
    
    it('prove tree with three nodes', async function () {
        const node1 = generateRandomHash();
        const node2 = generateRandomHash();
        const node3 = generateRandomHash();
        
        const inode1 = calculateNode(node1, node2);
        const inode2 = calculateNode(inode1, node3);
        
        const result = await this.prover.mmrIsValid(inode2.hash, node1, [ '0x', '0x' ], [ node2, node3 ]);        
        assert.ok(result);
        
        const result2 = await this.prover.mmrIsValid(inode2.hash, node2, [ node1, '0x' ], [ '0x', node3 ]);        
        assert.ok(result2);
        
        const result3 = await this.prover.mmrIsValid(inode2.hash, node3, [ inode1.hash ], [ '0x' ]);        
        assert.ok(result3);
    });
    
    it('prove tree with four nodes', async function () {
        const node1 = generateRandomHash();
        const node2 = generateRandomHash();
        const node3 = generateRandomHash();
        const node4 = generateRandomHash();
        
        const inode1 = calculateNode(node1, node2);
        const inode2 = calculateNode(node3, node4);
        const inode3 = calculateNode(inode1, inode2);
        
        const proof1 = makeProof([inode3, inode1, node1]);
        const result1 = await this.prover.mmrIsValid(inode3.hash, node1, proof1.prefixes, proof1.suffixes);        
        assert.ok(result1);
        
        const proof2 = makeProof([inode3, inode1, node2]);
        const result2 = await this.prover.mmrIsValid(inode3.hash, node2, proof2.prefixes, proof2.suffixes);        
        assert.ok(result2);
        
        const proof3 = makeProof([inode3, inode2, node3]);
        const result3 = await this.prover.mmrIsValid(inode3.hash, node3, proof3.prefixes, proof3.suffixes);        
        assert.ok(result3);
        
        const proof4 = makeProof([inode3, inode2, node4]);
        const result4 = await this.prover.mmrIsValid(inode3.hash, node4, proof4.prefixes, proof4.suffixes);        
        assert.ok(result4);
    });
    
    it('generate and process tree with 5 terminal nodes', async function () {
        await processTree(5, this.prover);
    });
    
    it('generate and process tree with 7 terminal nodes', async function () {
        await processTree(7, this.prover);
    });
    
    it('generate and process tree with 8 terminal nodes', async function () {
        await processTree(8, this.prover);
    });
    
    it('generate and process tree with 32 terminal nodes', async function () {
        await processTree(32, this.prover);
    });
    
    it('process proof', async function () {
        const nodes = [];
        const nnodes = 32;
        
        for (let k = 0; k < nnodes; k++)
            nodes.push(generateRandomHash());
    
        const tree = makeTree(nodes);

        const blockHash = '0x' + generateRandomHash().toString('hex');
        const blockNumber = nnodes;
        
        const paths = [];
        makePaths(tree, paths, []);

        const proof = makeProof(paths[nnodes - 1]);
        
        const mmrRoot = '0x' + tree.hash.toString('hex');
        
        await this.prover.initProcessProof(blockNumber, blockHash, mmrRoot);
        
        const proofId = await this.prover.getProofId(blockNumber, blockHash, mmrRoot);
        
        const newproof = await this.prover.proofs(proofId);
        
        assert.equal(newproof.blockNumber, blockNumber);
        assert.equal(newproof.blockHash, blockHash);
        assert.equal(newproof.mmrRoot, mmrRoot);
        
        const status = await this.prover.getProofStatus(blockNumber, blockHash, mmrRoot);
        
        assert.equal(status.blocksToProve.length, 5);
        assert.equal(status.proved.length, 5);
        
        for (let k = 0; k < status.proved.length; k++)
            assert.equal(status.proved[k], false);
        
        for (let k = 0; k < status.proved.length; k++) {
            const nblock = status.blocksToProve[k];            
            const proof = makeProof(paths[nblock]);
            
            await this.prover.processBlockProof(blockNumber, blockHash, mmrRoot, nblock, nodes[nblock], proof.prefixes, proof.suffixes);
            
            const newstatus = await this.prover.getProofStatus(blockNumber, blockHash, mmrRoot);
            
            assert.equal(newstatus.blocksToProve.length, 5);
            assert.equal(newstatus.proved.length, 5);
            
            for (let j = 0; j <= k; j++)
                assert.equal(newstatus.proved[j], true);
            
            for (let j = k + 1; j < status.blocksToProve.length; j++)
                assert.equal(newstatus.proved[j], false);
            
            const proved = await this.prover.isProved(blockNumber, blockHash, mmrRoot);
            const mmr = await this.recorder.getBlockMMRRoot(blockHash);       
            
            if (k == status.blocksToProve.length - 1) {
                assert.ok(proved);
                assert.equal(mmr, mmrRoot);
            }
            else {
                assert.ok(!proved);
                assert.equal(mmr, 0);
            }
        }
    });
    
    it('process proof with initial block number', async function () {
        const nodes = [];
        const nnodes = 32;
        const initial = 16;
        
        await this.prover.setInitialBlock(initial);
        
        for (let k = 0; k < nnodes; k++)
            nodes.push(generateRandomHash());
    
        const tree = makeTree(nodes);

        const blockHash = '0x' + generateRandomHash().toString('hex');
        const blockNumber = nnodes;
        
        const paths = [];
        makePaths(tree, paths, []);

        const proof = makeProof(paths[nnodes - 1]);
        
        const mmrRoot = '0x' + tree.hash.toString('hex');
        
        await this.prover.initProcessProof(blockNumber, blockHash, mmrRoot);
        
        const proofId = await this.prover.getProofId(blockNumber, blockHash, mmrRoot);
        
        const newproof = await this.prover.proofs(proofId);
        
        assert.equal(newproof.blockNumber, blockNumber);
        assert.equal(newproof.blockHash, blockHash);
        assert.equal(newproof.mmrRoot, mmrRoot);
        
        const status = await this.prover.getProofStatus(blockNumber, blockHash, mmrRoot);
        
        assert.equal(status.blocksToProve.length, 4);
        assert.equal(status.proved.length, 4);
        
        for (let k = 0; k < status.proved.length; k++)
            assert.ok(status.blocksToProve[k] >= initial);
        
        for (let k = 0; k < status.proved.length; k++)
            assert.equal(status.proved[k], false);
        
        for (let k = 0; k < status.proved.length; k++) {
            const nblock = status.blocksToProve[k];
            const proof = makeProof(paths[nblock]);
            
            await this.prover.processBlockProof(blockNumber, blockHash, mmrRoot, nblock, nodes[nblock], proof.prefixes, proof.suffixes);
            
            const newstatus = await this.prover.getProofStatus(blockNumber, blockHash, mmrRoot);
            
            assert.equal(newstatus.blocksToProve.length, 4);
            assert.equal(newstatus.proved.length, 4);
            
            for (let j = 0; j <= k; j++)
                assert.equal(newstatus.proved[j], true);
            
            for (let j = k + 1; j < status.blocksToProve.length; j++)
                assert.equal(newstatus.proved[j], false);
            
            const proved = await this.prover.isProved(blockNumber, blockHash, mmrRoot);
            const mmr = await this.recorder.getBlockMMRRoot(blockHash);       
            
            if (k == status.blocksToProve.length - 1) {
                assert.ok(proved);
                assert.equal(mmr, mmrRoot);
            }
            else {
                assert.ok(!proved);
                assert.equal(mmr, 0);
            }
        }
    });
    
    it('only owner can set block recorder', async function () {
        await utils.expectThrow(this.prover.setBlockRecorder(accounts[1], { from: accounts[2] }));
        
        const recorder = await this.prover.blockRecorder();
        
        assert.equal(recorder, this.recorder.address);
    });

    it('only owner can set initial block number', async function () {
        await utils.expectThrow(this.prover.setInitialBlock(10, { from: accounts[2] }));
        
        const initial = await this.prover.initialBlock();
        
        assert.equal(initial, 0);
    });
    
    it('getBlocksToProve', async function () {
        const blockHash = "0x79c54f2563c22ff3673415087a7679adfa2c5f15a216e71e90601e1ca753f219";
        const blockNumber = 123456789;
        const gas = await this.prover.getBlocksToProve.estimateGas(blockHash, blockNumber);
        utils.checkGas(gas);
        const blocksToProve = await this.prover.getBlocksToProve(blockHash, blockNumber);   
        assert.equal(27, blocksToProve.length);
        const firstBlock = blocksToProve[0];
        const latestBlock = blocksToProve[26];
        assert.ok(firstBlock.toNumber() > 0);
        assert.ok(firstBlock.toNumber() < 4572473);
        assert.equal(4069584, firstBlock.toNumber());
        assert.ok(latestBlock.toNumber() > 26 * 4572473);
        assert.ok(latestBlock.toNumber() < blockNumber);
        assert.equal(122953882, blocksToProve[26].toNumber());
    });
});
