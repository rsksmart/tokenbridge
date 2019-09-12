
const MMRProver = artifacts.require('./MMRProver.sol');

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

contract('MMRProver', function (accounts) {
    beforeEach(async function () {
        this.prover = await MMRProver.new();
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
});
