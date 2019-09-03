pragma solidity 0.5.0;

import "./EventsLibrary.sol";

contract EventsHelper {
    function getTransferEvents(bytes memory receipt, address origin, bytes32 topic) public pure returns(address[] memory tokens, address[] memory receivers, uint256[] memory amounts) {
        EventsLibrary.TransferEvent[] memory tevents = EventsLibrary.getTransferEvents(receipt, origin, topic);
        
        uint nevents = tevents.length;
            
        tokens = new address[](nevents);
        receivers = new address[](nevents);
        amounts = new uint[](nevents);
        
        for (uint k = 0; k < nevents; k++) {
            EventsLibrary.TransferEvent memory tevent = tevents[k];
            
            tokens[k] = tevent.token;
            receivers[k] = tevent.receiver;
            amounts[k] = tevent.amount;
        }
    }
}

