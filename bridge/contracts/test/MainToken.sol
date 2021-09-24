// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/token/ERC20/ERC20Detailed.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract MainToken is ERC20Detailed, ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals, uint totalSupply)
        ERC20Detailed(name, symbol, decimals)
    {
        _mint(msg.sender, totalSupply);
    }

    /**
     * ERC-677's only method implementation
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function transferAndCall(address _to, uint _value, bytes memory _data) public returns (bool) {
        bool result = transfer(_to, _value);
        if (!result) return false;

        ERC677TransferReceiver receiver = ERC677TransferReceiver(_to);
        receiver.tokenFallback(msg.sender, _value, _data);

        // IMPORTANT: the ERC-677 specification does not say
        // anything about the use of the receiver contract's
        // tokenFallback method return value. Given
        // its return type matches with this method's return
        // type, returning it could be a possibility.
        // We here take the more conservative approach and
        // ignore the return value, returning true
        // to signal a succesful transfer despite tokenFallback's
        // return value -- fact being tokens are transferred
        // in any case.
        return true;
    }
}

interface ERC677TransferReceiver {
    function tokenFallback(address from, uint256 amount, bytes calldata data) external returns (bool);
}