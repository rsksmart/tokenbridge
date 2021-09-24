// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/token/ERC777/IERC777Recipient.sol";
import "../zeppelin/introspection/IERC1820Registry.sol";

contract mockERC777Recipient is IERC777Recipient {
    IERC1820Registry constant private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor() {
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    event Success(
    address operator,
    address from,
    address to,
    uint amount,
    bytes userData,
    bytes operatorData);

    /**
     * ERC-677's only method implementation
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) override external {
        emit Success(operator, from, to, amount, userData, operatorData);
    }
}