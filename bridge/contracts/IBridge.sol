pragma solidity ^0.5.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";

interface IBridge {
    function version() external pure returns (string memory);

    function acceptTransfer(
        address originalTokenAddress,
        address receiver, uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    ) external returns(bool);

    function receiveTokens(address tokenToUse, uint256 amount) external payable;
}
