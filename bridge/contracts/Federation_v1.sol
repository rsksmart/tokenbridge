pragma solidity ^0.5.0;

import "./IBridge_v1.sol";
import "./zeppelin/ownership/Ownable.sol";

contract Federation_v1 is Ownable {
    uint constant public MAX_MEMBER_COUNT = 50;
    address constant private NULL_ADDRESS = address(0);

    IBridge_v1 public bridge;
    address[] public members;
    uint public required;

    mapping (address => bool) public isMember;
    mapping (bytes32 => mapping (address => bool)) public votes;
    mapping(bytes32 => bool) public processed;
    // solium-disable-next-line max-len
    event Voted(address indexed sender, bytes32 indexed transactionId, address originalTokenAddress, address receiver, uint256 amount, string symbol, bytes32 blockHash, bytes32 indexed transactionHash, uint32 logIndex, uint8 decimals, uint256 granularity);
    event Executed(bytes32 indexed transactionId);
    event MemberAddition(address indexed member);
    event MemberRemoval(address indexed member);
    event RequirementChange(uint required);

    modifier onlyMember() {
        require(isMember[_msgSender()], "Federation: Caller is not a member of the federation");
        _;
    }

    modifier validRequirement(uint membersCount, uint _required) {
        // solium-disable-next-line max-len
        require(_required <= membersCount && _required != 0 && membersCount != 0, "Federation: Required value is invalid for the current members count");
        _;
    }

    constructor(address[] memory _members, uint _required) public validRequirement(_members.length, _required) {
        members = _members;
        for (uint i = 0; i < _members.length; i++) {
            require(!isMember[_members[i]] && _members[i] != NULL_ADDRESS, "Federation: Members addresses are invalid");
            isMember[_members[i]] = true;
            emit MemberAddition(_members[i]);
        }
        required = _required;
        emit RequirementChange(required);
    }

    function setBridge(address _bridge) external onlyOwner {
        bridge = IBridge_v1(_bridge);
    }

    function voteTransaction(
        address originalTokenAddress,
        address receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity)
    external onlyMember returns(bool)
    {
        // solium-disable-next-line max-len
        bytes32 transactionId = getTransactionId(originalTokenAddress, receiver, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity);
        if (processed[transactionId])
            return true;

        if (votes[transactionId][_msgSender()])
            return true;

        votes[transactionId][_msgSender()] = true;
        // solium-disable-next-line max-len
        emit Voted(_msgSender(), transactionId, originalTokenAddress, receiver, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity);

        uint8 transactionCount = getTransactionCount(transactionId);
        if (transactionCount >= required && transactionCount >= members.length / 2 + 1) {
            processed[transactionId] = true;
            bool acceptTransfer = bridge.acceptTransfer(originalTokenAddress, receiver, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity);
            require(acceptTransfer, "Federation: Bridge Accept Transfer was not successful");
            emit Executed(transactionId);
            return true;
        }

        return true;
    }

    function getTransactionCount(bytes32 transactionId) public view returns(uint8) {
        uint8 count = 0;
        for (uint8 i = 0; i < members.length; i++) {
            if (votes[transactionId][members[i]])
                count += 1;
        }
        return count;
    }

    function hasVoted(bytes32 transactionId) external view returns(bool)
    {
        return votes[transactionId][_msgSender()];
    }

    function transactionWasProcessed(bytes32 transactionId) external view returns(bool)
    {
        return processed[transactionId];
    }

    function getTransactionId(
        address originalTokenAddress,
        address receiver,
        uint256 amount,
        string memory symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity)
    public pure returns(bytes32)
    {
        // solium-disable-next-line max-len
        return keccak256(abi.encodePacked(originalTokenAddress, receiver, amount, symbol, blockHash, transactionHash, logIndex, decimals, granularity));
    }

    function addMember(address _newMember) external onlyOwner
    {
        require(_newMember != NULL_ADDRESS, "Federation: Address cannot be empty");
        require(!isMember[_newMember], "Federation: Member already exists");
        require(members.length < MAX_MEMBER_COUNT, "Federation: Already at full capacity");

        isMember[_newMember] = true;
        members.push(_newMember);
        emit MemberAddition(_newMember);
    }

    function removeMember(address _oldMember) external onlyOwner
    {
        require(_oldMember != NULL_ADDRESS, "Federation: Address cannot be empty");
        require(isMember[_oldMember], "Federation: Member does not exists");
        require(members.length > 1, "Federation: Can't remove all the members");

        isMember[_oldMember] = false;
        for (uint i = 0; i < members.length - 1; i++) {
            if (members[i] == _oldMember) {
                members[i] = members[members.length - 1];
                break;
            }
        }
        members.length -= 1;
        emit MemberRemoval(_oldMember);
    }

    function getMembers() external view returns (address[] memory)
    {
        return members;
    }

    function changeRequirement(uint _required) external onlyOwner validRequirement(members.length, _required)
    {
        required = _required;
        emit RequirementChange(_required);
    }

}