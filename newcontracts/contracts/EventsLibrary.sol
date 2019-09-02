pragma solidity 0.5.0;

import "./RlpLibrary.sol";

library EventsLibrary {
    function getEvents(bytes memory receipt, address origin, bytes32 topic) internal pure returns(address[] memory tokens, address[] memory receivers, uint256[] memory amounts) {
        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(receipt, 0);        
        RlpLibrary.RlpItem[] memory events = RlpLibrary.getRlpItems(receipt, items[2].offset + items[2].length);
    
        uint nevents = events.length;
        
        tokens = new address[](nevents);
        receivers = new address[](nevents);
        amounts = new uint256[](nevents);

        uint j = 0;
        
        for (uint k = 0; k < nevents; k++) {
            uint offset = (k == 0) ? items[3].offset : events[k - 1].offset + events[k - 1].length;
            RlpLibrary.RlpItem[] memory evitems = RlpLibrary.getRlpItems(receipt, offset);
            
            if (RlpLibrary.rlpItemToAddress(receipt, evitems[0].offset) != origin)
                continue;
                
            RlpLibrary.RlpItem[] memory evtopics = RlpLibrary.getRlpItems(receipt, evitems[0].offset + evitems[0].length);
           
            if (RlpLibrary.rlpItemToBytes32(receipt, evtopics[0].offset) != topic)
                continue;
                
            tokens[j] = RlpLibrary.rlpItemToAddress(receipt, evtopics[1].offset + 12);
            receivers[j] = RlpLibrary.rlpItemToAddress(receipt, evtopics[2].offset + 12);
            amounts[j] = uint256(RlpLibrary.rlpItemToBytes32(receipt, evitems[2].offset));
            
            j++;
        }
    }
}
