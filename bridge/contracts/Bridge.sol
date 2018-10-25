pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/ERC20.sol";

contract Bridge {
    address owner;
    ERC20 token;
    
    constructor(address _owner, ERC20 _token) public {
        owner = _owner;
        token = _token;
    }
    
    function acceptTransfer(address receiver, uint amount) public returns(bool) {
        return token.transfer(receiver, amount);
    }
}

