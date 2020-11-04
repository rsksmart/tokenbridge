pragma solidity ^0.5.0;

import "../zeppelin/ownership/Secondary.sol";
import "./SideToken_v0.sol";

contract SideTokenFactory_v0 is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideToken_v0) {
        SideToken_v0 sideToken = new SideToken_v0(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}