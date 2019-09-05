pragma solidity >=0.4.21 <0.6.0;

import "./Transferable.sol";
import "./Verifier.sol";

contract Manager {
    address owner;

    mapping(bytes32 => bool) processed;
    mapping(address => uint) public lastBlockNumber;
    mapping(address => bytes32) public lastBlockHash;


    Transferable public transferable;
    Verifier public verifier;

    constructor(address _verifier) public {
        require(_verifier != address(0), "Empty verifier");
        verifier = Verifier(_verifier);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Sender is not the owner");
        _;
    }

    function setTransferable(Transferable _transferable) public onlyOwner {
        require(address(transferable) == address(0), "Empty transferable");
        transferable = _transferable;
    }

    function getTransactionId(uint blockNumber, bytes32 blockHash, bytes32 txReceiptHash)
        public pure returns(bytes32)
    {
        return keccak256(abi.encodePacked(blockNumber, blockHash, txReceiptHash));
    }

    function processCrossEvent(bytes memory rawBlockHeader, bytes memory rawTxReceipt, bytes memory rawTxReceiptTrieBranch)
        public returns(bool)
    {
        require(address(transferable) != address(0), "Transferable is not set");

        (bool result, uint256 blockNumber, bytes32 blockHash, bytes32 txReceiptHash, address tokenAddress,
        address to, uint256 amount, string memory symbol) = verifier.verifyEvent(rawBlockHeader, rawTxReceipt, rawTxReceiptTrieBranch);
        require(result, "Failed event verification");

        bytes32 voteId = getTransactionId(blockNumber, blockHash, txReceiptHash);
        if (processed[voteId])
            return false;

        if (blockNumber > lastBlockNumber[msg.sender]) {
            lastBlockHash[msg.sender] = blockHash;
            lastBlockNumber[msg.sender] = blockNumber;
        }
        
        //Process the _encodedLogs
        // TODO it presumes the token is should be mapped, so it calls processToken
        // this is not the expected behavior in production, but Manager is only a helper contract
        if (transferable.processToken(tokenAddress, symbol) && transferable.acceptTransfer(tokenAddress, to, amount)) {
            processed[voteId] = true;
        }
        return true;
    }

    function transactionWasProcessed(uint blockNumber, bytes32 blockHash, bytes32 txReceiptHash)
    public view returns(bool)
    {
        bytes32 voteId = getTransactionId(blockNumber, blockHash, txReceiptHash);
        return processed[voteId];
    }

}

