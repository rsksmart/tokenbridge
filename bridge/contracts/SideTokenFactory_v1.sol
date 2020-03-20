pragma solidity ^0.5.0;

import "./zeppelin/ownership/Secondary.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./ISideTokenFactory.sol";
import "./SideToken_v1.sol";
import "./CloneFactory.sol";

contract SideTokenFactory_v1 is ISideTokenFactory, Secondary, Ownable, CloneFactory {
    address public sideTokenTemplate;

    address constant private NULL_ADDRESS = address(0);

    constructor(address templateAddress) public {
        _setTemplateAddress(templateAddress);
    }

    function setTemplateAddress(address templateAddress) external onlyOwner {
        _setTemplateAddress(templateAddress);
    }

    function _setTemplateAddress(address templateAddress) internal {
        require(templateAddress != NULL_ADDRESS, "SideTokenFactory: Template can't be empty");
        sideTokenTemplate = templateAddress;
        emit TemplateUpdated(sideTokenTemplate);
    }

    function createSideToken(string calldata name, string calldata symbol, uint256 granularity) external onlyPrimary returns(address) {
        require(sideTokenTemplate != NULL_ADDRESS, "SideTokenFactory: Template hasn't been initialized");
        address sideToken = createClone(sideTokenTemplate);
        SideToken_v1(sideToken).initialize(name, symbol, primary(), granularity);
        emit SideTokenCreated(sideToken, symbol, granularity, sideTokenTemplate);
        return sideToken;
    }
}