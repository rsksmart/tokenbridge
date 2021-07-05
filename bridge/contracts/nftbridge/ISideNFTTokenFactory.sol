// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

interface ISideNFTTokenFactory {

    function createSideNFTToken(string calldata name, string calldata symbol) external returns(address);

    event SideNFTTokenCreated(address indexed sideToken, string symbol);
}