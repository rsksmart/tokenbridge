pragma solidity >=0.4.21 <0.6.0;

import "../zeppelin/token/ERC20/ERC20Detailed.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract MainToken is ERC20Detailed, ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals, uint totalSupply)
        ERC20Detailed(name, symbol, decimals) public
    {
        _mint(msg.sender, totalSupply);
    }
}

