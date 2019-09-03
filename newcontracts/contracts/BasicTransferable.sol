pragma solidity 0.5.0;

import "./Transferable.sol";

contract SimpleTransferable is Transferable {
    uint public ntransfers;
    address[] public tokens;
    address[] public receivers;
    uint[] public amounts;
    
    function acceptTransfer(address token, address receiver, uint256 amount) public returns(bool) {
        tokens.push(token);
        receivers.push(receiver);
        amounts.push(amount);
        ntransfers++;
        
        return true;
    }
}