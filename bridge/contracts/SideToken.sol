pragma solidity ^0.5.0;

import "./zeppelin/token/ERC777/ERC777.sol";

contract SideToken is ERC777 {
    address public minter;

    constructor(string memory _name, string memory _symbol, address _minter)
    ERC777(_name, _symbol, new address[](0)) public {
        require(_minter != address(0), "SideToken: Minter address is null");
        minter = _minter;
    }

    modifier onlyMinter() {
        require(_msgSender() == minter, "SideToken: Caller is not the minter");
        _;
    }
    function mint(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    public onlyMinter
    {
        _mint(_msgSender(), account, amount, userData, operatorData);
    }

}