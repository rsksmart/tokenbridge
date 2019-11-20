pragma solidity ^0.5.0;

import "./zeppelin/token/ERC777/ERC777.sol";

contract SideToken is ERC777 {

    constructor(string memory name, string memory symbol, address[] memory newDefaultOperators)
        ERC777(name, symbol, newDefaultOperators) public {}

    function operatorMint(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    public
    {
        require(isDefaultOperator(_msgSender()), "Only default Operators can Mint");
        _mint(_msgSender(), account, amount, userData, operatorData);
    }

    function isDefaultOperator(address anAddress) public view returns(bool _isDefaultOperator) {
        _isDefaultOperator = false;
        for (uint i = 0; i < defaultOperators().length; i++) {
                if(anAddress == defaultOperators()[i]) {
                    _isDefaultOperator = true;
                    break;
                }
        }
        return _isDefaultOperator;
    }

}