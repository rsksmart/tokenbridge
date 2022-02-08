// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../../nftbridge/NFTBridge.sol";

contract NFTInheritedBridge is NFTBridge {
    function checkChainIdExposed(uint256 chainId) public pure {
        return checkChainId(chainId);
    } 

    function shouldBeCurrentChainIdExposed(uint256 chainId) public view {
        return shouldBeCurrentChainId(chainId);
    } 
}