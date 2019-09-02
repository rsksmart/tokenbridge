pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./ReceiptProver.sol";
import "./Transferable.sol";

contract EventsProcessor {
    ReceiptProver public prover;
    Transferable public transferable;
    
    constructor(Transferable _transferable, ReceiptProver _prover) public {
        prover = _prover;
        transferable = _transferable;
    }
    
    // TODO process receipt only once
    function processReceipt(bytes32 blkhash, bytes memory receipt, bytes[] memory prefixes, bytes[] memory suffixes) public {
        require(prover.receiptIsValid(blkhash, receipt, prefixes, suffixes));
    }
}

