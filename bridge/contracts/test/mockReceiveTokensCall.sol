pragma solidity ^0.5.0;

import "../IBridge.sol";
import "../zeppelin/token/ERC20/IERC20.sol";

contract mockReceiveTokensCall {
    address public bridge;

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function callReceiveTokens(address tokenToUse, address receiver, uint256 amount) external {
        IERC20(tokenToUse).approve(bridge, amount);
        IBridge(bridge).receiveTokensTo(tokenToUse, receiver, amount);
    }

    function callDepositTo(address receiver) external payable {
        IBridge(bridge).depositTo.value(msg.value)(receiver);
    }
}