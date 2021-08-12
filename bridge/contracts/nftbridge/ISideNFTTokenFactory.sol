// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

interface ISideNFTTokenFactory {

    function createSideNFTToken(string calldata name, string calldata symbol, string calldata baseURI)
    external returns(address);

    event SideNFTTokenCreated(address indexed sideTokenAddress, string symbol);
}