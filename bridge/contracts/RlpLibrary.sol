pragma solidity >=0.4.21 <0.6.0;

library RlpLibrary {
    struct RlpItem {
        uint offset;
        uint length;
    }
    
    function isRlpList(bytes memory data, uint offset) pure internal returns (bool) {
        return data[offset] > 0xc0;
    }
    
    function getRlpTotalLength(bytes memory data, uint offset) pure internal returns (uint) {
        byte first = data[offset];
        
        if (first > 0xf7) {
            uint nbytes = uint8(first) - 0xf7;
            uint length;
            
            for (uint k = 0; k < nbytes; k++) {
                length <<= 8;
                length += uint8(data[1 + k + offset]);
            }
            
            return 1 + nbytes + length; 
        }

        if (first > 0xbf)
            return uint8(first) - 0xbf;

        if (first > 0xb7) {
            uint nbytes = uint8(first) - 0xb7;
            uint length;
            
            for (uint k = 0; k < nbytes; k++) {
                length <<= 8;
                length += uint8(data[1 + k + offset]);
            }
            
            return 1 + nbytes + length; 
        }
        
        if (first > 0x80)
            return uint8(first) - 0x80 + 1;
            
        return 1;
    }
    
    function getRlpLength(bytes memory data, uint offset) pure internal returns (uint) {
        byte first = data[offset];
        
        if (first > 0xf7) {
            uint nbytes = uint8(first) - 0xf7;
            uint length;
            
            for (uint k = 0; k < nbytes; k++) {
                length <<= 8;
                length += uint8(data[1 + k + offset]);
            }
            
            return length;
        }
        
        if (first > 0xbf)
            return uint8(first) - 0xbf - 1;
            
        if (first > 0xb7) {
            uint nbytes = uint8(first) - 0xb7;
            uint length;
            
            for (uint k = 0; k < nbytes; k++) {
                length <<= 8;
                length += uint8(data[1 + k + offset]);
            }
            
            return length;
        }
        
        if (first > 0x80)
            return uint8(first) - 0x80;
            
        if (first == 0x80)
            return 0;
            
        return 1;
    }
    
    function getRlpOffset(bytes memory data, uint offset) pure internal returns (uint) {
        return getRlpTotalLength(data, offset) - getRlpLength(data, offset) + offset;
    }
    
    function getRlpItem(bytes memory data, uint offset) pure internal returns (RlpItem memory item) {
        item.length = getRlpLength(data, offset);
        item.offset = getRlpTotalLength(data, offset) - item.length + offset;
    }
    
    function getRlpNumItems(bytes memory data, uint offset) pure internal returns (uint) {
        RlpItem memory item = getRlpItem(data, offset);
        
        uint itemOffset = item.offset;
        uint end = item.offset + item.length;
        uint nitems = 0;
        
        while (itemOffset < end) {
            nitems++;
            item = getRlpItem(data, itemOffset);
            itemOffset = item.offset + item.length;
        }
        
        return nitems;
    }

    function getRlpItems(bytes memory data, uint offset) pure internal returns (RlpItem[] memory items) {
        uint nitems = getRlpNumItems(data, offset);
        items = new RlpItem[](nitems);
        
        RlpItem memory item = getRlpItem(data, offset);
        
        uint itemOffset = item.offset;

        for (uint k = 0; k < nitems; k++) {
            item = getRlpItem(data, itemOffset);
            items[k] = item;
            itemOffset = item.offset + item.length;
        }
    }
    
    function rlpItemToBytes(bytes memory data, uint offset, uint length) internal pure returns (bytes memory) {
        bytes memory result = new bytes(length);
        
        uint source;
        uint target;
        
        assembly {
            source := add(add(data, 0x20), offset)
            target := add(result, 0x20)
        }
        
        for (; length >= 32; length -= 0x20) {
            assembly {
                mstore(target, mload(source))
                target := add(target, 0x20)
                source := add(source, 0x20)
            }
        }
        
        if (length == 0)
            return result;

        uint mask = 256 ** (0x20 - length) - 1;
        
        assembly {
            let sourcePart := and(mload(source), not(mask))
            let targetPart := and(mload(target), mask)
            mstore(target, or(sourcePart, targetPart))
        }
        
        return result;
    }
    
    function rlpItemToAddress(bytes memory data, uint offset) internal pure returns (address result) {
        // TODO consider shr instead of div
        assembly {
            result := div(mload(add(add(data, 0x20), offset)), 0x1000000000000000000000000)
        }
    }
    
    function rlpItemToBytes32(bytes memory data, uint offset) internal pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(data, 0x20), offset))
        }
    }
    
    function rlpItemToUint256(bytes memory data, uint offset, uint length) internal pure returns (uint256 result) {
        assembly {
            result := mload(add(add(data, 0x20), offset))
        }
        
        result = result / (256 ** (0x20 - length));
    }
}

