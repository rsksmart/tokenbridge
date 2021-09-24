// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../zeppelin/ownership/Secondary.sol";
import "../interface/ISideTokenFactory.sol";
import "../SideToken/SideToken.sol";

contract SideTokenFactory is ISideTokenFactory, Secondary {

    function createSideToken(string calldata name, string calldata symbol, uint256 granularity)
    external onlyPrimary override returns(address) {
        address sideToken = address(new SideToken(name, symbol, primary(), granularity));
        emit SideTokenCreated(sideToken, symbol, granularity);
        return sideToken;
    }
}