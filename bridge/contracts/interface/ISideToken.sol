// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

interface ISideToken {
    function mint(address account, uint256 amount, bytes calldata userData, bytes calldata operatorData) external;
}