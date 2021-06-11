// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./zeppelin/ownership/Secondary.sol";
import "./ISideTokenFactory.sol";
import "./SideToken.sol";

contract SideTokenFactory is ISideTokenFactory, Secondary {

    function createSideToken(string calldata name, string calldata symbol, uint256 granularity)
    external onlyPrimary override returns(address) {
        address sideToken = address(new SideToken(name, symbol, primary(), granularity));
        emit SideTokenCreated(sideToken, symbol, granularity);
        return sideToken;
    }
}