pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/ERC20.sol";
import "./Transferable.sol";

contract Bridge is Transferable {
    address manager;
    ERC20 token;

    modifier onlyManager() {
        require(msg.sender == manager);
        _;
    }
    
    constructor(address _manager, ERC20 _token) public {
        manager = _manager;
        token = _token;
    }
    
    function acceptTransfer(address receiver, uint256 amount) public onlyManager returns(bool) {
        return token.transfer(receiver, amount);
    }
}

