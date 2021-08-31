// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../zeppelin/ownership/Secondary.sol";
import "../previous/SideToken_old.sol";

contract SideTokenFactoryV1 is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideToken_old) {
        SideToken_old sideToken = new SideToken_old(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}