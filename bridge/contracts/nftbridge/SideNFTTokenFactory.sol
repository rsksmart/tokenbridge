// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../zeppelin/ownership/Secondary.sol";
import "./ISideNFTTokenFactory.sol";
import "./SideNFTToken.sol";

contract SideNFTTokenFactory is ISideNFTTokenFactory, Secondary {

    function createSideNFTToken(string calldata name, string calldata symbol, string calldata baseURI)
    external onlyPrimary override returns(address) {
        address sideTokenAddress = address(new SideNFTToken(name, symbol, primary(), baseURI));
        emit SideNFTTokenCreated(sideTokenAddress, symbol);
        return sideTokenAddress;
    }
}