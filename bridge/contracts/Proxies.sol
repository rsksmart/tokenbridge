// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./zeppelin/upgradable/proxy/TransparentUpgradeableProxy.sol";

contract BridgeProxy is TransparentUpgradeableProxy {
  // solhint-disable-next-line no-empty-blocks
  constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}

contract AllowTokensProxy is TransparentUpgradeableProxy {
  // solhint-disable-next-line no-empty-blocks
  constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}

contract FederationProxy is TransparentUpgradeableProxy {
  // solhint-disable-next-line no-empty-blocks
  constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}