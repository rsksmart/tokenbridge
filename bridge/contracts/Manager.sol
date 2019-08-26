pragma solidity ^0.4.24;

import "./Transferable.sol";

contract Manager {
    address owner;

    mapping(bytes32 => bool) processed;

    mapping(address => uint) public lastBlockNumber;
    mapping(address => bytes32) public lastBlockHash;


    Transferable public transferable;

    modifier onlyOwner() {
        require(msg.sender == owner, "Sender is not the owner");
        _;
    }

    function setTransferable(Transferable _transferable) public onlyOwner {
        require(transferable == address(0), "Empty transferable");
        transferable = _transferable;
    }

    function getTransactionId(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, bytes _encodedLogs)
        public pure returns(bytes32)
    {
        return keccak256(abi.encodePacked(_blockNumber, _blockHash, _transactionHash, _encodedLogs));
    }

    function processCrossEvent(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, bytes _encodedLogs) public
    {
        bytes32 voteId = getTransactionId(_blockNumber, _blockHash, _transactionHash, _encodedLogs);

        if (processed[voteId])
            return;

        if (_blockNumber > lastBlockNumber[msg.sender]) {
            lastBlockHash[msg.sender] = _blockHash;
            lastBlockNumber[msg.sender] = _blockNumber;
        }
        //Process the _encodedLogs
        //if (transferable.acceptTransfer(_receiver, _amount)) {
            processed[voteId] = true;
        //}
    }

    function transactionWasProcessed(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, bytes _encodedLogs)
    public view returns(bool) 
    {
        bytes32 voteId = getTransactionId(_blockNumber, _blockHash, _transactionHash,  _encodedLogs);
        return processed[voteId];
    }

}

