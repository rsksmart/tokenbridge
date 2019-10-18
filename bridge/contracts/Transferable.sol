pragma solidity >=0.4.21 <0.6.0;

contract Transferable {
    function acceptTransfer(
        address originalTokenAddress,
        address receiver, uint256 amount,
        string memory symbol,
        uint blockNumber,
        bytes32 blockHash,
        bytes32 transactionHash,
        string memory logIndex
    ) public returns(bool);
}
