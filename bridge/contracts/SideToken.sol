pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/token/ERC20/ERC20Burnable.sol";
import "./zeppelin/token/ERC20/ERC20Mintable.sol";
import "./zeppelin/token/ERC20/ERC20Detailed.sol";
import "./IERC677TransferReceiver.sol";

contract SideToken is ERC20Detailed, ERC20Mintable, ERC20Burnable {
    /**
     * Transfer event as described in ERC-677
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    constructor(string memory name, string memory symbol)
        ERC20Detailed(name, symbol, 18) public {}

    /**
     * ERC-677's only method implementation
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function transferAndCall(address _to, uint _value, bytes memory _data) public returns (bool) {
        bool result = transfer(_to, _value);
        if (!result) return false;

        emit Transfer(msg.sender, _to, _value, _data);

        IERC677TransferReceiver receiver = IERC677TransferReceiver(_to);
        receiver.tokenFallback(msg.sender, _value, _data);
        return true;
    }
}