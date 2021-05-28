// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

interface IERC677Receiver {
  function onTokenTransfer(address _sender, uint _value, bytes calldata _data) external;
}