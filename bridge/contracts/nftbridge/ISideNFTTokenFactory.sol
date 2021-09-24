// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

interface ISideNFTTokenFactory {

    function createSideNFTToken(string calldata name, string calldata symbol, string calldata baseURI,
        string calldata contractURI) external returns(address);

    event SideNFTTokenCreated(address indexed sideTokenAddress, string symbol, string baseURI, string contractURI);
}