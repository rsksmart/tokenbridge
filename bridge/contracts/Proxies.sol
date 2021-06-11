// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./zeppelin/upgradable/proxy/TransparentUpgradeableProxy.sol";

contract BridgeProxy is TransparentUpgradeableProxy {
    constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}

contract AllowTokensProxy is TransparentUpgradeableProxy {
    constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}

contract FederationProxy is TransparentUpgradeableProxy {
    constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic,_admin, _data) payable {}
}