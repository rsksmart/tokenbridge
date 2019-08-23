pragma solidity 0.5.0;

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
}

