pragma solidity ^0.5.0;

import "../IBridge_v2.sol";

contract mockReceiveTokensCall {
    address public bridge;

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function callReceiveTokens(address tokenToUse, address receiver, uint256 amount) public returns(bool) {
        return IBridge_v2(bridge).receiveTokens(tokenToUse, receiver, amount);
    }
}