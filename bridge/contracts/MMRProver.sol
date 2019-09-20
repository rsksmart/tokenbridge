pragma solidity >=0.4.21 <0.6.0;
pragma experimental ABIEncoderV2;

import "./ProofLibrary.sol";
import "./BlockRecorder.sol";

contract MMRProver {
    address public owner;
    uint public initialBlock;
    BlockRecorder public blockRecorder;
    
    struct ProofData {
        uint blockNumber;
        bytes32 blockHash;
        bytes32 mmrRoot;
        uint[] blocksToProve;
        bool[] proved;
    }
    
    mapping (bytes32 => ProofData) public proofs;
    
    modifier onlyOwner() {
        require(owner == msg.sender);
        _;
    }
    
    constructor() public {
        owner = msg.sender;
    }
    
    function setBlockRecorder(BlockRecorder recorder) public onlyOwner {
        blockRecorder = recorder;
    }
    
    function setInitialBlock(uint initial) public onlyOwner {
        initialBlock = initial;
    }
    
    function getProofId(uint blockNumber, bytes32 blockHash, bytes32 mmrRoot) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(blockNumber, blockHash, mmrRoot));
    }
    
    function initProcessProof(uint blockNumber, bytes32 blockHash, bytes32 mmrRoot) public {
        bytes32 proofId = getProofId(blockNumber, blockHash, mmrRoot);
        
        ProofData storage proof = proofs[proofId];
        
        if (proof.blockNumber != 0)
            return;
            
        proof.blockNumber = blockNumber;
        proof.blockHash = blockHash;
        proof.mmrRoot = mmrRoot;
        proof.blocksToProve = getBlocksToProve(blockHash, blockNumber);
        
        uint ntoprove = proof.blocksToProve.length;
        
        for (uint k = 0; k < ntoprove; k++)
            proof.proved.push(false);
    }
    
    function processBlockProof(uint blockNumber, bytes32 blockHash, bytes32 mmrRoot, uint otherBlockNumber, bytes memory initial, bytes[] memory prefixes, bytes[] memory suffixes) public returns (bool) {
        bytes32 proofId = getProofId(blockNumber, blockHash, mmrRoot);
        
        ProofData storage proof = proofs[proofId];
        
        if (proof.blockNumber == 0)
            return false;
            
        if (alreadyProved(proof, otherBlockNumber))
            return true;
            
        if (!mmrIsValid(mmrRoot, initial, prefixes, suffixes))
            return false;
                        
        uint ntoprove = proof.blocksToProve.length;
        
        for (uint k = 0; k < ntoprove; k++)
            if (proof.blocksToProve[k] == otherBlockNumber) {
                proof.proved[k] = true;
                break;
            }
            
        if (allBlocksProved(proof))
            blockRecorder.recordMMR(proof.blockHash, proof.mmrRoot);
    }
    
    function allBlocksProved(ProofData storage proof) private view returns (bool) {
        if (proof.blockNumber == 0)
            return false;
            
        uint nblocks = proof.blocksToProve.length;
        
        for (uint k = 0; k < nblocks; k++)
            if (proof.proved[k] == false)
                return false;
                
        return true;
    }
    
    function isProved(uint blockNumber, bytes32 blockHash, bytes32 mmrRoot) public view returns (bool) {
        bytes32 proofId = getProofId(blockNumber, blockHash, mmrRoot);
        
        ProofData storage proof = proofs[proofId];

        return allBlocksProved(proof);
    }
    
    function getProofStatus(uint blockNumber, bytes32 blockHash, bytes32 mmrRoot) public view returns (uint[] memory blocksToProve, bool[] memory proved) {
        bytes32 proofId = getProofId(blockNumber, blockHash, mmrRoot);
        
        ProofData storage proof = proofs[proofId];
        
        uint nblocks = proof.blocksToProve.length;
        
        blocksToProve = new uint[](nblocks);
        proved = new bool[](nblocks);
        
        for (uint k = 0; k < nblocks; k++) {
            blocksToProve[k] = proof.blocksToProve[k];
            proved[k] = proof.proved[k];
        }
    }
    
    function alreadyProved(ProofData storage proof, uint otherBlockNumber) private view returns (bool) {
        if (proof.blockNumber == 0)
            return false;
            
        uint ntoprove = proof.blocksToProve.length;
            
        for (uint k = 0; k < ntoprove; k++)
            if (proof.blocksToProve[k] == otherBlockNumber)
                return proof.proved[k];
                
        return false;
    }

    function mmrIsValid(bytes32 finalmmr, bytes memory initial, bytes[] memory prefixes, bytes[] memory suffixes) public pure returns (bool) {
        bytes32 root = ProofLibrary.calculateRoot(initial, prefixes, suffixes);
        return root == finalmmr;
    }

    function getBlocksToProve(bytes32 blockHash, uint256 blockNumber) public view returns (uint256[] memory blocksToProve) {
        //TODO this is an example, implement actual fiat-shamir transform to get the blocks
        uint blocksCount = log_2(blockNumber - initialBlock);
        blocksToProve = new uint256[](blocksCount);
        uint256 jump = (blockNumber - initialBlock) / blocksCount;
        
        for(uint i = 0; i < blocksCount; i++){
            blocksToProve[i] = initialBlock + (jump * i + uint256(blockHash) % jump);
        }
        
        return blocksToProve;
    }

    function log_2(uint x) public pure returns (uint y) {
        //efficient (< 700 gas) way to calculate the ceiling of log_2: https://ethereum.stackovernet.com/es/q/2476#text_a30168
        assembly {
           let arg := x
           x := sub(x,1)
           x := or(x, div(x, 0x02))
           x := or(x, div(x, 0x04))
           x := or(x, div(x, 0x10))
           x := or(x, div(x, 0x100))
           x := or(x, div(x, 0x10000))
           x := or(x, div(x, 0x100000000))
           x := or(x, div(x, 0x10000000000000000))
           x := or(x, div(x, 0x100000000000000000000000000000000))
           x := add(x, 1)
           let m := mload(0x40)
           mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
           mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
           mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
           mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
           mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
           mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
           mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
           mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
           mstore(0x40, add(m, 0x100))
           let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
           let shift := 0x100000000000000000000000000000000000000000000000000000000000000
           let a := div(mul(x, magic), shift)
           y := div(mload(add(m,sub(255,a))), shift)
           y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }
}

