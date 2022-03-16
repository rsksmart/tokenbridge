// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestTokenCreator {
  address public _owner;

  constructor() {
    _owner = msg.sender;
  }

  function creator() public view returns (address) {
    return _owner;
  }
}
