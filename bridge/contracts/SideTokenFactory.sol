pragma solidity ^0.5.0;

import "./zeppelin/ownership/Ownable.sol";
import "./SideToken.sol";

contract SideTokenFactory is Ownable {
    event createdSideToken(address sideToken, string symbol);

    function createSideToken(string calldata name, string calldata symbol) external onlyOwner returns(SideToken) {
        address[] memory defaultOperators = new address[](1);
        defaultOperators[0] = owner();
        SideToken sideToken = new SideToken(name, symbol, defaultOperators);
        emit createdSideToken(address(sideToken), symbol);
        return sideToken;
    }
}