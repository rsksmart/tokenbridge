pragma solidity >=0.4.21 <0.6.0;

import "./RlpLibrary.sol";

library EventsLibrary {
    struct TransferEvent {
        address token;
        address receiver;
        uint amount;
    }
    
    struct TokenEvent {
        address token;
        string symbol;
    }
    
    function getTokenEvents(bytes memory receipt, address origin, bytes32 topic) internal pure returns(TokenEvent[] memory tevents) {
        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(receipt, 0);        
        RlpLibrary.RlpItem[] memory events = RlpLibrary.getRlpItems(receipt, items[2].offset + items[2].length);
    
        uint nevents = events.length;
        
        tevents = new TokenEvent[](nevents);

        uint j = 0;
        
        for (uint k = 0; k < nevents; k++) {
            uint offset = (k == 0) ? items[3].offset : events[k - 1].offset + events[k - 1].length;
            RlpLibrary.RlpItem[] memory evitems = RlpLibrary.getRlpItems(receipt, offset);
            
            //if (RlpLibrary.rlpItemToAddress(receipt, evitems[0].offset) != origin)
            //    continue;
                
            RlpLibrary.RlpItem[] memory evtopics = RlpLibrary.getRlpItems(receipt, evitems[0].offset + evitems[0].length);

            if (RlpLibrary.rlpItemToBytes32(receipt, evtopics[0].offset) != topic)
                continue;
                
            uint symlength = uint256(RlpLibrary.rlpItemToBytes32(receipt, evitems[2].offset + 32));
                
            tevents[j] = TokenEvent(
                RlpLibrary.rlpItemToAddress(receipt, evtopics[1].offset + 12),
                string(RlpLibrary.rlpItemToBytes(receipt, evitems[2].offset + 64, symlength))
            );
            
            j++;
        }
    }
    
    function getTransferEvents(bytes memory receipt, address origin, bytes32 topic) internal pure returns(TransferEvent[] memory tevents) {
        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(receipt, 0);        
        RlpLibrary.RlpItem[] memory events = RlpLibrary.getRlpItems(receipt, items[2].offset + items[2].length);
    
        uint nevents = events.length;
        
        tevents = new TransferEvent[](nevents);

        uint j = 0;
        
        for (uint k = 0; k < nevents; k++) {
            uint offset = (k == 0) ? items[3].offset : events[k - 1].offset + events[k - 1].length;
            RlpLibrary.RlpItem[] memory evitems = RlpLibrary.getRlpItems(receipt, offset);
            
            if (RlpLibrary.rlpItemToAddress(receipt, evitems[0].offset) != origin)
                continue;
                
            RlpLibrary.RlpItem[] memory evtopics = RlpLibrary.getRlpItems(receipt, evitems[0].offset + evitems[0].length);
           
            if (RlpLibrary.rlpItemToBytes32(receipt, evtopics[0].offset) != topic)
                continue;
                
            tevents[j] = TransferEvent(
                RlpLibrary.rlpItemToAddress(receipt, evtopics[1].offset + 12),
                RlpLibrary.rlpItemToAddress(receipt, evtopics[2].offset + 12),
                uint256(RlpLibrary.rlpItemToBytes32(receipt, evitems[2].offset))
            );
            
            j++;
        }
    }
}
