pragma solidity >=0.4.21 <0.6.0;

import "./Transferable.sol";

contract SimpleTransferable is Transferable {
    uint public ntransfers;
    address[] public tokens;
    address[] public receivers;
    uint[] public amounts;
    
    uint public ntokens;
    address[] public newtokens;
    string[] public symbols;
    
    function acceptTransfer(address token, address receiver, uint256 amount) public returns(bool) {
        tokens.push(token);
        receivers.push(receiver);
        amounts.push(amount);
        ntransfers++;
        
        return true;
    }
    
    function processToken(address token, string memory symbol) public returns (bool) {
        newtokens.push(token);
        symbols.push(symbol);
        ntokens++;
        
        return true;
    }
}

