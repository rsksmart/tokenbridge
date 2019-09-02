pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./BlockRecorder.sol";
import "./ProofLibrary.sol";

import "./RlpLibrary.sol";

contract ReceiptProver {
    BlockRecorder public blockRecorder;
    
    constructor(BlockRecorder recorder) public {
        blockRecorder = recorder;
    }
    
    function receiptIsValid(bytes32 blkhash, bytes memory receipt, bytes[] memory prefixes, bytes[] memory suffixes) public view returns (bool) {
        bytes32 receiptRoot = ProofLibrary.calculateRoot(receipt, prefixes, suffixes);
        
        return blockRecorder.blockData(blkhash) == receiptRoot;
    }
}

