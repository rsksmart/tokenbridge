// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/token/ERC20/ERC20.sol";

contract AlternativeERC20Detailed is ERC20 {
    string private _name;
    bytes32 private _symbol;
    uint256 private _decimals;

    constructor(string memory aName, bytes32 aSymbol, uint256 someDecimals, uint256 aTotalSupply)
    {
        _name = aName;
        _symbol = aSymbol;
        _decimals = someDecimals;
        _mint(msg.sender, aTotalSupply);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (bytes32) {
        return _symbol;
    }

    function decimals() public view returns (uint256) {
        return _decimals;
    }
}