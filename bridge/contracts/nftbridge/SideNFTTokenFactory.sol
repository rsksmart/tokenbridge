// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../zeppelin/ownership/Secondary.sol";
import "./ISideNFTTokenFactory.sol";
import "./SideNFTToken.sol";

contract SideNFTTokenFactory is ISideNFTTokenFactory, Secondary {

    function createSideNFTToken(string calldata name, string calldata symbol)
    external onlyPrimary override returns(address) {
        address sideToken = address(new SideNFTToken(name, symbol, primary()));
        emit SideNFTTokenCreated(sideToken, symbol);
        return sideToken;
    }
}