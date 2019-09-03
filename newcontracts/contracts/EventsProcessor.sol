pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./EventsLibrary.sol";
import "./ReceiptProver.sol";
import "./Transferable.sol";

contract EventsProcessor {
    ReceiptProver public prover;
    Transferable public transferable;
    mapping (bytes32 => bool) public processed;
    
    constructor(Transferable _transferable, ReceiptProver _prover) public {
        prover = _prover;
        transferable = _transferable;
    }
    
    function processReceipt(bytes32 blkhash, bytes memory receipt, bytes[] memory prefixes, bytes[] memory suffixes) public {
        bytes32 hash = keccak256(abi.encodePacked(blkhash, receipt));
        
        require(processed[hash] == false);
        require(prover.receiptIsValid(blkhash, receipt, prefixes, suffixes));
        
        
        
        processed[hash] = true;
    }
}

