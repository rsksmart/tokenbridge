pragma solidity ^0.5.0;

import "../IBridge.sol";

contract mockReceiveTokensCall {
    address public bridge;

    constructor(address _bridge) public {
        bridge = _bridge;
    }

    function callReceiveTokens(address tokenToUse, uint256 amount) public returns(bool) {
        return IBridge(bridge).receiveTokens(tokenToUse, amount);
    }
}