pragma solidity ^0.5.0;

import "./zeppelin/ownership/Ownable.sol";
import "./SideToken.sol";

contract SideTokenFactory is Ownable {

    function createSideToken(string memory name, string memory symbol) public onlyOwner returns(SideToken) {
        return new SideToken(name, symbol, owner());
    }
}