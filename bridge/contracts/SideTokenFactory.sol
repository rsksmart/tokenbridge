pragma solidity ^0.5.0;

import "./zeppelin/ownership/Secondary.sol";
import "./SideToken.sol";

contract SideTokenFactory is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideToken) {
        SideToken sideToken = new SideToken(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}