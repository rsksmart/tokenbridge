pragma solidity ^0.5.0;

import "./zeppelin/token/ERC777/ERC777.sol";
import "./zeppelin/access/roles/MinterRole.sol";

contract SideToken is ERC777, MinterRole {

event test(address);
event testOperators(address[]);
    constructor(string memory name, string memory symbol, address newMinter)
        ERC777(name, symbol, new address[](0)) public
        {
            if(!isMinter(newMinter))
                addMinter(newMinter);
        }

    function operatorMint(
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