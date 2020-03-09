pragma solidity ^0.5.0;

import "./zeppelin/ownership/Secondary.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./SideToken_v1.sol";
import "./CloneFactory.sol";

contract SideTokenFactory_v1 is Secondary, Ownable, CloneFactory {
    address public sideTokenTemplate;

    address constant private NULL_ADDRESS = address(0);

    event SideTokenCreated(address indexed sideToken, string symbol, uint256 granularity, address templateAddress);
    event TemplateUpdated(address newSideTokenTemplate);

    constructor(address templateAddress) public {
        setTemplateAddress(templateAddress);
    }

    function setTemplateAddress(address templateAddress) public onlyOwner {
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