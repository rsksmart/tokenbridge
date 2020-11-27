pragma solidity ^0.5.0;

import "./zeppelin/ownership/Secondary.sol";
import "./ISideTokenFactory.sol";
import "./SideToken_v2.sol";

contract SideTokenFactory_v2 is ISideTokenFactory, Secondary {

    function createSideToken(string calldata name, string calldata symbol, uint256 granularity) external onlyPrimary returns(address) {
        address sideToken = address(new SideToken_v2(name, symbol, primary(), granularity));
        emit SideTokenCreated(sideToken, symbol, granularity);
        return sideToken;
    }
}