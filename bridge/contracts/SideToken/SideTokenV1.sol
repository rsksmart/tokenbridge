// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/token/ERC777/ERC777.sol";

contract SideTokenV1 is ERC777 {
    address public minter;

    constructor(string memory _tokenName, string memory _tokenSymbol, address _minterAddr)
    ERC777(_tokenName, _tokenSymbol, new address[](0)) {
        require(_minterAddr != address(0), "SideToken: Minter address is null");
        minter = _minterAddr;
    }

    modifier onlyMinter() {
        require(_msgSender() == minter, "SideToken: Caller is not the minter");
        _;
    }
    function mint(
        address account,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
    external onlyMinter
    {
        _mint(_msgSender(), account, amount, userData, operatorData);
    }

}