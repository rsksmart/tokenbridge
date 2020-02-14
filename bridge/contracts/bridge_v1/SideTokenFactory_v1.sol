pragma solidity ^0.5.0;

import "../zeppelin/ownership/Secondary.sol";
import "./SideToken_v1.sol";

contract SideTokenFactory_v1 is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideToken_v1) {
        SideToken_v1 sideToken = new SideToken_v1(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}