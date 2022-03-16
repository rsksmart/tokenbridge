// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

interface ISideTokenFactory {

    function createSideToken(string calldata name, string calldata symbol, uint256 granularity) external returns(address);

    event SideTokenCreated(address indexed sideToken, string symbol, uint256 granularity);
}