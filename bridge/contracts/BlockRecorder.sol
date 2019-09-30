pragma solidity >=0.4.21 <0.6.0;

import "./RlpLibrary.sol";
import "./RskPowLibrary.sol";

contract BlockRecorder {
    address public mmrProvider;
    
    struct BlockData {
        uint number;
        uint difficulty;
        bytes32 receiptRoot;
        bool mmrProved;
    }
    
    mapping(bytes32 => BlockData) public blockData;
    
    modifier onlyMMRProvider() {
        require(msg.sender == mmrProvider, "Only MMR Provider can call this function");
        _;
    }
    
    constructor(address _mmrProvider) public {
        mmrProvider = _mmrProvider;
    }
    
    function recordBlock(bytes memory blk) public {        
        bytes32 hash = keccak256(blk);   

        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(blk, 0);
        
        uint blockDifficulty = RlpLibrary.rlpItemToUint256(blk, items[7].offset, items[7].length);
        uint blockNumber = RlpLibrary.rlpItemToUint256(blk, items[8].offset, items[8].length);
        
        bytes memory bitcoinMergedMiningHeader = RlpLibrary.rlpItemToBytes(blk, items[16].offset, items[16].length);
        
        require(RskPowLibrary.isValid(blockDifficulty, bitcoinMergedMiningHeader), "Block difficulty doesn't reach the target");
        
        bytes memory trrbytes = RlpLibrary.rlpItemToBytes(blk, items[5].offset, items[5].length);
        bytes32 trrhash;
        
        assembly {
            trrhash := mload(add(trrbytes, 0x20))
        }
        
        blockData[hash].number = blockNumber;
        blockData[hash].difficulty = blockDifficulty;
        blockData[hash].receiptRoot = trrhash;
    }
    
    function mmrProved(bytes32 blockHash) public onlyMMRProvider {
        blockData[blockHash].mmrProved = true;
    }
    
    function getBlockReceiptRoot(bytes32 blockHash) public view returns (bytes32) {
        return blockData[blockHash].receiptRoot;
    }
    
    function getBlockMMRProved(bytes32 blockHash) public view returns (bool) {
        return blockData[blockHash].mmrProved;
    }
}

