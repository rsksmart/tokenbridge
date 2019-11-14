pragma solidity >=0.4.21 <0.6.0;

import "./SideToken.sol";

contract SideTokenFactory {
    function createSideToken(string memory name, string memory symbol) public returns (SideToken) {
        SideToken sideToken = new SideToken(name, symbol);
        return sideToken;
    }
}