pragma solidity ^0.4.24;

import "./Transferable.sol";

contract FederatedManager {
    address owner;
    address[] public members;
    
    mapping(bytes32 => address[]) votes;
    mapping(bytes32 => bool) processed;
    
    mapping(address => uint) lastBlockNumber;
    mapping(address => bytes32) lastBlockHash;
    
    mapping(address => address[]) newMemberVotes;
    mapping(address => address[]) oldMemberVotes;
    
    mapping(address => address[]) managersVotes;

    Transferable public transferable;
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyMember() {
        require(isMember(msg.sender));
        _;
    }

    constructor(address[] _members) public {
        members = _members;
        owner = msg.sender;
    }
    
    function setTransferable(Transferable _transferable) public onlyOwner {
        require(transferable == address(0));
        transferable = _transferable;
    }
    
    function isMember(address _account) public view returns(bool) {
        uint n = members.length;
        
        for (uint16 k = 0; k < n; k++)
            if (members[k] == _account)
                return true;
                
        return false;
    }
    
    function voteTransaction(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public onlyMember
    {
        bytes32 voteId = getTransactionVoteId(_blockNumber, _blockHash, _transactionHash, _receiver, _amount);
        
        if (processed[voteId])
            return;

        address[] storage transactionVotes = votes[voteId];
        uint n = transactionVotes.length;
        
        for (uint16 k = 0; k < n; k++)
            if (transactionVotes[k] == msg.sender)
                return;
        
        transactionVotes.push(msg.sender);

        lastBlockHash[msg.sender] = _blockHash;
        lastBlockNumber[msg.sender] = _blockNumber;
        
        if (transactionVotes.length < members.length / 2 + 1)
            return;
            
        if (transferable.acceptTransfer(_receiver, _amount)) {
            delete votes[voteId];
            processed[voteId] = true;
        }
    }
    
    function getLastBlockNumberByAddress(address voter) public view returns (uint) {
        return lastBlockNumber[voter];
    }
    
    function getLastBlockHashByAddress(address voter) public view returns (bytes32) {
        return lastBlockHash[voter];
    }
    
    function transactionVotes(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public view returns(address[]) 
    {
        bytes32 voteId = getTransactionVoteId(_blockNumber, _blockHash, _transactionHash, _receiver, _amount);
        
        return votes[voteId];
    }

    function transactionNoVotes(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public view returns(uint) 
    {
        bytes32 voteId = getTransactionVoteId(_blockNumber, _blockHash, _transactionHash, _receiver, _amount);
        
        return votes[voteId].length;
    }

    function transactionWasProcessed(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount) 
        public view returns(bool) 
    {
        bytes32 voteId = getTransactionVoteId(_blockNumber, _blockHash, _transactionHash, _receiver, _amount);
        
        return processed[voteId];
    }
    
    function getTransactionVoteId(uint _blockNumber, bytes32 _blockHash, bytes32 _transactionHash, address _receiver, uint _amount)
        public pure returns(bytes32)
    {
        return keccak256(abi.encodePacked(_blockNumber, _blockHash, _transactionHash, _receiver, _amount));
    }
    
    function voteAddMember(address _newMember) public onlyMember
    {
        if (isMember(_newMember))
            return;
            
        address[] storage memberVotes = newMemberVotes[_newMember];
        uint nvotes = memberVotes.length;
        
        for (uint k = 0; k < nvotes; k++)
            if (memberVotes[k] == msg.sender)
                return;
                
        memberVotes.push(msg.sender);

        if (memberVotes.length < members.length / 2 + 1)
            return;
            
        members.push(_newMember);
        delete newMemberVotes[_newMember];
    }
    
    function addMemberVotes(address _newMember) 
        public view returns(address[]) 
    {
        return newMemberVotes[_newMember];
    }

    function addMemberNoVotes(address _newMember) 
        public view returns(uint) 
    {
        return newMemberVotes[_newMember].length;
    }

    function voteRemoveMember(address _oldMember) public onlyMember
    {
        if (!isMember(_oldMember))
            return;
            
        address[] storage memberVotes = oldMemberVotes[_oldMember];
        uint nvotes = memberVotes.length;
        
        for (uint k = 0; k < nvotes; k++)
            if (memberVotes[k] == msg.sender)
                return;
                
        memberVotes.push(msg.sender);

        if (memberVotes.length < members.length / 2 + 1)
            return;
            
        uint nmembers = members.length;
        
        for (uint j = 0; j < nmembers; j++) {
            if (members[j] == _oldMember) {
                if (j < nmembers - 1)
                    members[j] = members[nmembers - 1];
                
                members.length--;
            }
        }

        delete oldMemberVotes[_oldMember];
    }
    
    function removeMemberVotes(address _oldMember) 
        public view returns(address[]) 
    {
        return oldMemberVotes[_oldMember];
    }

    function removeMemberNoVotes(address _oldMember) 
        public view returns(uint) 
    {
        return oldMemberVotes[_oldMember].length;
    }

    function voteNewManager(address _newManager) public onlyMember
    {
        if (_newManager == address(this))
            return;
            
        address[] storage managerVotes = managersVotes[_newManager];
        uint nvotes = managerVotes.length;
        
        for (uint k = 0; k < nvotes; k++)
            if (managerVotes[k] == msg.sender)
                return;
                
        managerVotes.push(msg.sender);

        if (managerVotes.length < members.length / 2 + 1)
            return;
            
        transferable.changeManager(_newManager);
        delete managersVotes[_newManager];
    }
    
    function newManagerVotes(address _newManager) 
        public view returns(address[]) 
    {
        return managersVotes[_newManager];
    }

    function newManagerNoVotes(address _newManager) 
        public view returns(uint) 
    {
        return managersVotes[_newManager].length;
    }
}

