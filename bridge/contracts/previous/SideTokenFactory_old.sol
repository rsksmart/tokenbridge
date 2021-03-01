pragma solidity ^0.5.0;

import "../zeppelin/ownership/Secondary.sol";
import "./SideToken_old.sol";

contract SideTokenFactory_old is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideToken_old) {
        SideToken_old sideToken = new SideToken_old(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}