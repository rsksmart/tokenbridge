pragma solidity >=0.4.21 <0.6.0;

import "./RlpLibrary.sol";

contract RlpHelper {
    function getRlpTotalLength(bytes memory data, uint offset) public pure returns (uint) {
        return RlpLibrary.getRlpTotalLength(data, offset);
    }
    
    function getRlpLength(bytes memory data, uint offset) public pure returns (uint) {
        return RlpLibrary.getRlpLength(data, offset);
    }
    
    function getRlpOffset(bytes memory data, uint offset) public pure returns (uint) {
        return RlpLibrary.getRlpOffset(data, offset);
    }
    
    function getRlpItem(bytes memory data, uint offset) public pure returns (uint itemOffset, uint itemLength) {
        RlpLibrary.RlpItem memory item = RlpLibrary.getRlpItem(data, offset);
        
        return (item.offset, item.length);
    }
    
    function getRlpNumItems(bytes memory data, uint offset) public pure returns (uint) {
        return RlpLibrary.getRlpNumItems(data, offset);
    }
    
    function getRlpItems(bytes memory data, uint offset) public pure returns (uint[] memory offsets, uint[] memory lengths) {
        RlpLibrary.RlpItem[] memory items = RlpLibrary.getRlpItems(data, offset);
        
        uint nitems = items.length;
        
        offsets = new uint[](nitems);
        lengths = new uint[](nitems);
        
        for (uint k = 0; k < nitems; k++) {
            offsets[k] = items[k].offset;
            lengths[k] = items[k].length;
        }
    }
    
    function rlpItemToBytes(bytes memory data, uint offset, uint length) public pure returns (bytes memory) {
        return RlpLibrary.rlpItemToBytes(data, offset, length);
    }
    
    function rlpItemToAddress(bytes memory data, uint offset) public pure returns(address) {
        return RlpLibrary.rlpItemToAddress(data, offset);
    }
    
    function rlpItemToBytes32(bytes memory data, uint offset) public pure returns(bytes32) {
        return RlpLibrary.rlpItemToBytes32(data, offset);
    }
}

