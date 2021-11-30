// Sources flattened with hardhat v2.6.1 https://hardhat.org

// SPDX-License-Identifier: MIT
import "../zeppelin/token/ERC20/ERC20.sol";

pragma solidity ^0.8.0;

contract WTBTC is ERC20 {
  string public name     = "Ethereum Test BTC";
  string public symbol   = "WTBTC";
  uint8  public decimals = 18;

  constructor(uint256 initialSupply) {
    _mint(msg.sender, initialSupply);
  }

  function mint(uint256 supply) external {
    _mint(msg.sender, supply);
  }

}