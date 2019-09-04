
pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

contract Emitter {
    event BeginEvents();
    event Token(address indexed token, string symbol);
    event Cross(address indexed token, address indexed receiver, uint256 amount);
    event EndEvents();
    
    function emitTokenEvents(address[] memory tokens, string[] memory symbols) public {
        uint nevents = tokens.length;
        
        emit BeginEvents();
        
        for (uint k = 0; k < nevents; k++)
            emit Token(tokens[k], symbols[k]);
            
        emit EndEvents();
    }
    
    function emitCrossEvents(address[] memory receivers, address[] memory tokens, uint256[] memory amounts) public {
        uint nevents = receivers.length;
        
        emit BeginEvents();
        
        for (uint k = 0; k < nevents; k++)
            emit Cross(tokens[k], receivers[k], amounts[k]);
            
        emit EndEvents();
    }
}

