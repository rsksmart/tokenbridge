pragma solidity ^0.5.0;

import "../zeppelin/token/ERC20/ERC20.sol";

contract AlternativeERC20Detailed is ERC20 {
    string private _name;
    bytes32 private _symbol;
    uint256 private _decimals;

    constructor(string memory name, bytes32 symbol, uint256 decimals, uint256 totalSupply) public
    {
        _name = name;
        _symbol = symbol;
        _decimals = decimals;
        _mint(msg.sender, totalSupply);
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