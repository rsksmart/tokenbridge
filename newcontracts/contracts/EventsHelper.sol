pragma solidity 0.5.0;

import "./EventsLibrary.sol";

contract EventsHelper {
    function getEvents(bytes memory receipt, address origin, bytes32 topic) public pure returns(address[] memory tokens, address[] memory receivers, uint256[] memory amounts) {
        return EventsLibrary.getEvents(receipt, origin, topic);
    }
}
