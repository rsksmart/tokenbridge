// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../zeppelin/ownership/Secondary.sol";
import "../SideToken/SideTokenV1.sol";

contract SideTokenFactoryV1 is Secondary {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyPrimary returns(SideTokenV1) {
        SideTokenV1 sideToken = new SideTokenV1(name, symbol, primary());
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}