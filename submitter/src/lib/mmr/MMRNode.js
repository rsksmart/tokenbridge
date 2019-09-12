const ethUtils = require('ethereumjs-util');
const BN = ethUtils.BN;
const RLP = ethUtils.rlp;

const utils = require('../utils.js');

module.exports = class MMRNode {
    constructor() {
        this.hash = '0x';
        this.left = null;
        this.right = null;
        this.start_height = 0;
        this.end_height = 0;
        //The ones below are not yet needed
        this.start_time = 0;
        this.end_time = 0;
        this.start_difficulty = new BN();
        this.end_difficulty = new BN();
        this.subtree_total_difficulty = new BN();
    }

    static fromBlock(block) {
        let newNode = new MMRNode();
        newNode.hash = block.hash;
        newNode.left = null;
        newNode.right = null;
        newNode.start_height = block.number;
        newNode.end_height = block.number;
        newNode.start_time = block.timestamp;
        newNode.end_time = block.timestamp;
        newNode.start_difficulty = new BN(block.difficulty);
        newNode.end_difficulty = new BN(block.difficulty);
        newNode.total_difficulty = new BN(block.total_difficulty);
        return newNode;
    }

    static H(lefthash, righthash) {
        return ethUtils.bufferToHex(ethUtils.keccak256(lefthash + utils.stripHexPrefix(righthash)));
    }

    static makeParent(left, right) {
        let newNode = new MMRNode();
        newNode.hash = this.H(left.hash, right.hash);
        newNode.left = left;
        newNode.right = right;
        newNode.start_height = left.start_height;
        newNode.end_height = right.end_height;
        newNode.start_time = left.start_time;
        newNode.end_time = right.end_time;
        newNode.start_difficulty = left.start_difficulty;
        newNode.end_difficulty = right.end_difficulty;
        newNode.total_difficulty = left.total_difficulty.add(right.total_difficulty);
        return newNode;
    }

    isLeaf() {
        return this.left == null;
    }

    leavesCount() {
        return this.end_height - this.start_height +1;
    }

    serialize() {
        let valuesToEncode = [
            this.hash,
            this.left,
            this.right,
            this.start_height,
            this.end_height,
            //The ones below are not yet needed
            this.start_time,
            this.end_time,
            this.start_difficulty,
            this.end_difficulty,
            this.total_difficulty
        ];
        return RLP.encode(valuesToEncode);
    }

    toString() {
        return `{ hash:${this.hash}, start_height:${this.start_height}, end_height:${this.end_height}, ` +
        `left:${this.left.hash}, right:${this.right.hash} }`;
    }
}