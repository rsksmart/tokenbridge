pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/BurnableToken.sol";
import "./zeppelin/token/ERC20/MintableToken.sol";
import "./zeppelin/token/ERC20/DetailedERC20.sol";
import "./zeppelin/token/ERC20/StandardToken.sol";
import "./ERC677TransferReceiver.sol";
import "./Transferable.sol";

contract SideToken is DetailedERC20, MintableToken, BurnableToken {
    /**
     * Transfer event as described in ERC-677
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    constructor(string _name, string _symbol, uint8 _decimals, uint _totalSupply) DetailedERC20(_name, _symbol, _decimals)
        public {
            totalSupply_ = _totalSupply;
            balances[msg.sender] = _totalSupply;
        }

    /**
     * ERC-677's only method implementation
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function transferAndCall(address _to, uint _value, bytes memory _data) public returns (bool) {
        bool result = transfer(_to, _value);
        if (!result) return false;

        emit Transfer(msg.sender, _to, _value, _data);

        ERC677TransferReceiver receiver = ERC677TransferReceiver(_to);
        receiver.tokenFallback(msg.sender, _value, _data);
        return true;
    }
}