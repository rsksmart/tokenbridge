pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./ReceiptProver.sol";
import "./EventsLibrary.sol";
import "./Transferable.sol";

contract EventsProcessor {
    ReceiptProver public prover;
    Transferable public transferable;
    address public origin;
    bytes32 public transferTopic;
    bytes32 public tokenTopic;
    
    mapping (bytes32 => bool) public processed;
    
    constructor(Transferable _transferable, ReceiptProver _prover, address _origin, bytes32 _transferTopic, bytes32 _tokenTopic) public {
        prover = _prover;
        transferable = _transferable;
        origin = _origin;
        transferTopic = _transferTopic;
        tokenTopic = _tokenTopic;
    }
    
    function processReceipt(bytes32 blkhash, bytes memory receipt, bytes[] memory prefixes, bytes[] memory suffixes) public {
        bytes32 hash = keccak256(abi.encodePacked(blkhash, receipt));
        
        require(processed[hash] == false);
        require(prover.receiptIsValid(blkhash, receipt, prefixes, suffixes));

        EventsLibrary.TokenEvent[] memory tkevents = EventsLibrary.getTokenEvents(receipt, origin, tokenTopic);
        uint ntkevents = tkevents.length;
        
        for (uint k = 0; k < ntkevents; k++) {
            EventsLibrary.TokenEvent memory tkevent = tkevents[k];
            
            if (tkevent.token != address(0))
                transferable.processToken(tkevent.token, tkevent.symbol);
        }
        
        EventsLibrary.TransferEvent[] memory tevents = EventsLibrary.getTransferEvents(receipt, origin, transferTopic);
        uint nevents = tevents.length;
        
        for (uint k = 0; k < nevents; k++) {
            EventsLibrary.TransferEvent memory tevent = tevents[k];
            
            if (tevent.amount != 0)
                transferable.acceptTransfer(tevent.token, tevent.receiver, tevent.amount);
        }
        
        processed[hash] = true;
    }
}

