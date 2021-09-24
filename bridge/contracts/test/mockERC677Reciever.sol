// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/token/ERC20/ERC20Detailed.sol";
import "../zeppelin/token/ERC20/ERC20.sol";
import "../interface/IERC677Receiver.sol";

contract mockERC677Receiver is IERC677Receiver {
    event Success(address _sender, uint _value, bytes _data);
    /**
     * ERC-677's only method implementation
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function onTokenTransfer(address _sender, uint _value, bytes memory _data) override public {
        emit Success(_sender, _value, _data);
    }
}