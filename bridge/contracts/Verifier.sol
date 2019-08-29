pragma solidity ^0.4.24;

contract Verifier {
    function verifyRskPow(bytes memory rawBlockHeader) public returns(bool) {
        return true;
    }

    function verifyEthPow(bytes memory rawBlockHeader) public returns(bool) {
        return true;
    }

    function verifyBlockInChain(bytes memory rawBlockHeader) public returns(bool) {
        return true;
    }

    function verifyEvent(bytes memory rawBlockHeader, bytes memory rawTxReceipt,
    bytes memory rawTxReceiptTrieBranch) public returns(bool result, uint256 blockNumber,
    bytes32 blockHash, bytes32 txReceiptHash, address tokenAddress, address to, uint256 amount,
    string memory symbol) {
        result = true;
        blockNumber = 131925;
        blockHash = 0x79c54f2563c22ff3673415087a7679adfa2c5f15a216e71e90601e1ca753f219;
        txReceiptHash = 0xa636cbd79d6c94cd0c68ad90b6a90df0dbe610f0ad1fe643c8f07a12f332137d;
        tokenAddress = 0xc4375b7de8af5a38a93548eb8453a498222c4ff2;
        to = 0x170346689cc312d8e19959bc68c3ad03e72c9850;
        amount = 1000000000000000000;
        symbol = "RIF";
        return (result, blockNumber, blockHash, txReceiptHash, tokenAddress, to, amount, symbol);
    }
}
