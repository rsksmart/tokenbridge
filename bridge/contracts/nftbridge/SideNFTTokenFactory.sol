// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../zeppelin/ownership/Secondary.sol";
import "./ISideNFTTokenFactory.sol";
import "./SideNFTToken.sol";

contract SideNFTTokenFactory is ISideNFTTokenFactory, Secondary {

    function createSideNFTToken(string calldata name, string calldata symbol, string calldata baseURI,
        string calldata contractURI) external onlyPrimary override returns(address) {
        address sideTokenAddress = address(new SideNFTToken(name, symbol, primary(), baseURI, contractURI));
        emit SideNFTTokenCreated(sideTokenAddress, symbol, baseURI, contractURI);
        return sideTokenAddress;
    }
}