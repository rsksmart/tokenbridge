pragma solidity ^0.5.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";

contract IBridge {
    function version() public pure returns (string memory);

    function acceptTransfer(
        address originalTokenAddress,
        address receiver, uint256 amount,
        string memory symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    ) public returns(bool);

    function receiveTokens(ERC20Detailed tokenToUse, uint256 amount) public payable returns (bool);
}
