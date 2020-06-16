pragma solidity ^0.5.0;

import "../IBridge_v1.sol";

contract mockReceiveTokensCall {
    address public bridge;

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function callReceiveTokens(address tokenToUse, uint256 amount) public {
        IBridge_v1(bridge).receiveTokens(tokenToUse, amount);
    }
}