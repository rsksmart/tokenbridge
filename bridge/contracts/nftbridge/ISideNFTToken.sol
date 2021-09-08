// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

interface ISideNFTToken {
  function mint(address account, uint256 tokenId) external;
}