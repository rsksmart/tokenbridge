pragma solidity >=0.4.21 <0.6.0;

import "./RlpLibrary.sol";
import "./RskPowLibrary.sol";

contract BlockRecorder {
    mapping(bytes32 => bytes32) public blockData;
    
    function recordBlock(bytes memory blk) public {        
        bytes32 hash = keccak256(blk);   

        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(blk, 0);
        
        uint256 blockDifficulty = RlpLibrary.rlpItemToUint256(blk, items[7].offset, items[7].length);
        bytes memory bitcoinMergedMiningHeader = RlpLibrary.rlpItemToBytes(blk, items[16].offset, items[16].length);
        
        require(RskPowLibrary.isValid(blockDifficulty, bitcoinMergedMiningHeader), "Block difficulty doesn't reach the target");
        
        bytes memory trrbytes = RlpLibrary.rlpItemToBytes(blk, items[5].offset, items[5].length);
        bytes32 trrhash;
        
        assembly {
            trrhash := mload(add(trrbytes, 0x20))
        }
        
        blockData[hash] = trrhash;
    }
}

