pragma solidity >=0.4.21 <0.6.0;
pragma experimental ABIEncoderV2;

import "./ReceiptProver.sol";
import "./EventsLibrary.sol";
import "./Transferable.sol";

contract EventsProcessor {
    address owner;

    ReceiptProver public prover;
    Transferable public transferable;
    address public origin;
    bytes32 public transferTopic;
    bytes32 public tokenTopic;
    
    mapping (bytes32 => bool) public processed;
    
    constructor(ReceiptProver _prover, bytes32 _transferTopic, bytes32 _tokenTopic) public {
        owner = msg.sender;
        prover = _prover;
        transferTopic = _transferTopic;
        tokenTopic = _tokenTopic;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Sender is not the owner");
        _;
    }

    function setTransferable(Transferable _transferable) public onlyOwner {
        require(address(transferable) == address(0), "Try to reset transferable");
        transferable = _transferable;
    }

    function setOrigin(address _origin) public onlyOwner {
        require(address(origin) == address(0), "Try to reset origin");
        origin = _origin;
    }
    
    function processReceipt(bytes32 blkhash, bytes memory receipt, bytes[] memory prefixes, bytes[] memory suffixes) public {
        bytes32 hash = keccak256(abi.encodePacked(blkhash, receipt));
        
        // TODO consider require
        if (processed[hash])
            return;
            
        require(prover.receiptIsValid(blkhash, receipt, prefixes, suffixes), "Invalid receipt");

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

