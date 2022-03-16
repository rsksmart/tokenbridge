// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../lib/LibUtils.sol";

contract LibUtilsHarness {

    function decimalsToGranularity(uint8 decimals) external pure returns (uint256) {
        return LibUtils.decimalsToGranularity(decimals);
    }

    function getDecimals(address tokenToUse) external view returns (uint8) {
        return LibUtils.getDecimals(tokenToUse);
    }

    function getGranularity(address tokenToUse) external view returns (uint256) {
        return LibUtils.getGranularity(tokenToUse);
    }

    function bytesToAddress(bytes memory bys) external pure returns (address addr) {
        return LibUtils.bytesToAddress(bys);
    }

    function toUint128(bytes memory _bytes, uint256 _start) external pure returns (uint128) {
        return LibUtils.toUint128(_bytes, _start);
    }

}
