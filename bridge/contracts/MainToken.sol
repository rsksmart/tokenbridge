pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/DetailedERC20.sol";
import "./zeppelin/token/ERC20/StandardToken.sol";

contract MainToken is DetailedERC20, StandardToken {
    constructor(string _name, string _symbol, uint8 _decimals, uint _totalSupply) DetailedERC20(_name, _symbol, _decimals)
        public {
        totalSupply_ = _totalSupply;
        balances[msg.sender] = _totalSupply;
    }
}

