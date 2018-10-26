pragma solidity ^0.4.24;

contract FederatedManager {
    address[] public members;
    
    mapping(bytes32 => address[]) votes;
    
    constructor(address[] _members) public {
        members = _members;
    }
    
    function isMember(address _account) public view returns(bool) {
        uint n = members.length;
        
        for (uint16 k = 0; k < n; k++)
            if (members[k] == _account)
                return true;
                
        return false;
    }
    
    function voteTransaction(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public {
        require(isMember(msg.sender));
        
        bytes32 voteId = keccak256(abi.encodePacked(_blockNumber, _blockHash, _transactionHash, _receiver, _amount));

        address[] storage transactionVotes = votes[voteId];
        uint n = transactionVotes.length;
        
        for (uint16 k = 0; k < n; k++)
            if (transactionVotes[k] == msg.sender)
                return;
        
        transactionVotes.push(msg.sender);
    }
    
    function transactionVotes(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public view returns(address[]) {
        bytes32 voteId = keccak256(abi.encodePacked(_blockNumber, _blockHash, _transactionHash, _receiver, _amount));
        
        return votes[voteId];
    }
}

