// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/ownership/Secondary.sol";
import "../SideToken/SideTokenV1.sol";

contract SideTokenFactoryV1 is Secondary {
    event CreatedSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideTokenV1) {
        SideTokenV1 sideToken = new SideTokenV1(name, symbol, primary());
        emit CreatedSideToken(address(sideToken), symbol);
        return sideToken;
    }
}