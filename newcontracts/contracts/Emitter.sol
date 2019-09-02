
pragma solidity 0.5.0;

contract Emitter {
    event BeginEvents();
    event Cross(address indexed token, address indexed receiver, uint256 amount);
    event EndEvents();
    
    function emitEvents(address[] memory receivers, address[] memory tokens, uint256[] memory amounts) public {
        uint nevents = receivers.length;
        
        emit BeginEvents();
        
        for (uint k = 0; k < nevents; k++)
            emit Cross(tokens[k], receivers[k], amounts[k]);
            
        emit EndEvents();
    }
}

