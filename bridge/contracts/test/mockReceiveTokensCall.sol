// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interface/IBridge.sol";
import "../zeppelin/token/ERC20/IERC20.sol";
import "../zeppelin/token/ERC777/IERC777.sol";
import "../zeppelin/token/ERC777/IERC777Recipient.sol";
import "../zeppelin/introspection/IERC1820Registry.sol";

contract mockReceiveTokensCall is IERC777Recipient {
    address public bridge;
    IERC1820Registry constant public erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor(address _bridge) {
        bridge = _bridge;
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function callReceiveTokens(address tokenToUse, address receiver, uint256 amount, uint256 destinationChainId) external {
        IERC20(tokenToUse).approve(bridge, amount);
        IBridge(bridge).receiveTokensTo(destinationChainId, tokenToUse, receiver, amount);
    }

    function callDepositTo(address receiver, uint256 destinationChainId) external payable {
        IBridge(bridge).depositTo{ value: msg.value }(destinationChainId, receiver);
    }

    function callTokensReceived(address tokenToUse, uint256 amount, bytes calldata data) external {
        IERC777(tokenToUse).send(bridge, amount, data);
    }

    // Mandatory for IERC777Recipient
    function tokensReceived(
        address,
        address,
        address,
        uint,
        bytes calldata,
        bytes calldata
    ) override external view {
        this;
    }
}