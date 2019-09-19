const MMRNode = require('./MMRNode.js');

module.exports = class MMRTree {
    constructor() {
        this.root = null;
    }

    getRoot(){
        return this.root;
    }

    appendBlock(block) {
        let leaf = MMRNode.fromBlock(block);
        this._appendLeaf(leaf);
    }

    _appendLeaf(leaf) {
        if(this.root == null) {
            this.root = leaf;
        } else {
            this.root = this._append(this.root, leaf);
        }
        return this.root;
    }

    //Recursive function to append a new leaf node to an existing MMR
    _append(root, leaf) {
        //find the number of leaves in the subtree
        let leaves = root.end_height - root.start_height + 1;
        // if the subtree under this root has power of 2 no. of leaves
        // then we append the leaf to the current root
        if (!(leaves & (leaves - 1))) {
            return MMRNode.makeParent(root, leaf);
        }
        // otherwise, we append the leaf to the right subtree
        // note that this recursive call will naturally merge balanced subtrees after it appends the leaf
        let newRight = this._append(root.right, leaf);
        return MMRNode.makeParent(root.left, newRight)
    }
    
    getPrefixesSuffixesProof(blockNumber) {
        return this._createPrefixesSuffixesProof(this.root, blockNumber);
    }
    
    _createPrefixesSuffixesProof(root, blockNumber) {
        let proof = {
            prefixes: [],
            suffixes: []
        };
        
        //if its a leaf we found the block, return empty array to start appending on recursion
        if (root.isLeaf()) {
            return proof;
        }
        
        //If its on the left side of the peak
        if(blockNumber <= root.left.end_height) {
            //call recursively to get the other complements to the left
            proof = this._createPrefixesSuffixesProof(root.left, blockNumber);
            //add the right node as its a complement to get the peak
            proof.suffixes.push(root.right.hash);
            proof.prefixes.push('0x');
        } else {
            //call recursively to get the other complements to the right
            proof = this._createPrefixesSuffixesProof(root.right, blockNumber);
            //add the left node as its a complement to get the peak
            proof.prefixes.push(root.left.hash);
            proof.suffixes.push('0x');
        }
        
        return proof;
    }

    getMerkleProof(blockNumber) {
        return this._createMerkleProof(this.root, blockNumber);
    }

    _createMerkleProof(root, blockNumber) {
        let proof = [];
        //if its a leaf we found the block, return empty array to start appending on recursion
        if (root.isLeaf()) {
            return proof;
        }
        //If its on the left side of the peak
        if(blockNumber <= root.left.end_height){
            //call recursively to get the other complements to the left
            proof = this._createMerkleProof(root.left, blockNumber);
            //add the right node as its a complement to get the peak
            proof.push(root.right);

        } else {
            //call recursively to get the other complements to the right
            proof = this._createMerkleProof(root.right, blockNumber);
            //add the left node as its a complement to get the peak
            proof.push(root.left);
        }
        return proof;
    }

    static verifyPrefixesSuffixesProof(rootHash, block, prefixes, suffixes) {
        let hashValue = block.hash;
        const deep = prefixes.length;
        
        for (let k = 0; k < deep; k++) {
            if (prefixes[k] === '0x') {
                hashValue = MMRNode.H(hashValue, suffixes[k]);
            } else {
                hashValue = MMRNode.H(prefixes[k], hashValue);
            }
        }
        
        return hashValue == rootHash;
    }
    
    static verifyMerkleProof(rootHash, mmrTotalLeaves, leafNumber, block, merkleProof) {
        let leafNumberToCheck = leafNumber -1;
        let remainingLeaves = mmrTotalLeaves;
        let hashValue = block.hash;

        if(merkleProof.length != Math.ceil(Math.log2(remainingLeaves))) {
            return false;
        }
        for(let complement of merkleProof) {
            //Check its even
            if(leafNumberToCheck % 2 == 0 && leafNumberToCheck + 1 <= remainingLeaves) {
                hashValue = MMRNode.H(hashValue, complement.hash);
            } else {
                hashValue = MMRNode.H(complement.hash, hashValue);
            }
            leafNumberToCheck = Math.trunc(leafNumberToCheck/2);
            remainingLeaves = Math.trunc(remainingLeaves/2);
        }
        if(hashValue == rootHash) {
            return true;
        }
        return false;
    }

    serialize() {
        let root = this.getRoot();
        let tree = [];

        this._serializeTree(root, tree);
        return tree;
    }

    // Builds up a serialized list into the current MMRTree
    deserialize(serialized = []) {
        for (let node of serialized) {
            let leaf = MMRNode.fromValues(node);
            this._appendLeaf(leaf);
        };
    }

    // Recursive function to get the MMRTree as a list of leaves
    _serializeTree(root, list) {
        if (root === null) {
            return;
        }
        if (root.left === null && root.right === null) {
            list.push(root);
        }

        this._serializeTree(root.left, list);
        this._serializeTree(root.right, list);
    }

    getLeaf(blockNumber) {
        return this._getLeaf(this.root, blockNumber);
    }

    _getLeaf(root, blockNumber) {
        //if its a leaf we found the block, return empty array to start appending on recursion
        if (root.isLeaf()) {
            return root;
        }
        let result = null;
        //If its on the left side of the peak
        if(blockNumber <= root.left.end_height){
            //call recursively to get the leaf
            result =  this._getLeaf(root.left, blockNumber);
        } else {
            //call recursively to get the leaf
            result =  this._getLeaf(root.right, blockNumber);
        }
        return result;
    }
}
