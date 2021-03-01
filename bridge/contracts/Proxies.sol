pragma solidity ^0.5.0;

import "./zeppelin/upgradable/Proxy-flattened.sol";

contract BridgeProxy is AdminUpgradeabilityProxy {
    constructor(address _logic, address _admin, bytes memory _data) AdminUpgradeabilityProxy(_logic,_admin, _data) public payable {
    }
}

contract AllowTokensProxy is AdminUpgradeabilityProxy {
    constructor(address _logic, address _admin, bytes memory _data) AdminUpgradeabilityProxy(_logic,_admin, _data) public payable {
    }
}