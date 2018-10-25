pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/DetailedERC20.sol";
import "./zeppelin/token/ERC20/StandardToken.sol";

contract SideToken is DetailedERC20, StandardToken {
    address public manager;
    
    constructor(string _name, string _symbol, uint8 _decimals, address _manager) 
        DetailedERC20(_name, _symbol, _decimals)
        public {
        manager = _manager;
    }
    
    function acceptTransfer(address receiver, uint amount) public returns(bool) {
        totalSupply_ += amount;
        balances[receiver] += amount;
        
        return true;
    }
}

