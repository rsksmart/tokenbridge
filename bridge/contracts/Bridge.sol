pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/ERC20.sol";

contract Bridge {
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
    
    function acceptTransfer(address receiver, uint amount) public onlyManager returns(bool) {
        return token.transfer(receiver, amount);
    }
}

