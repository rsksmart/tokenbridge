// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

import "./IBridge.sol";
import "./zeppelin/ownership/Ownable.sol";

contract Federation is Ownable {
    uint constant public MAX_MEMBER_COUNT = 50;
    address constant private NULL_ADDRESS = address(0);

    IBridge public bridge;
    address[] public members;
    uint public required;

    mapping (address => bool) public isMember;
    mapping (bytes32 => mapping (address => bool)) public votes;
    mapping(bytes32 => bool) public processed;

    event Executed(bytes32 indexed transactionId);
    event MemberAddition(address indexed member);
    event MemberRemoval(address indexed member);
    event RequirementChange(uint required);
    event BridgeChanged(address bridge);
    event Voted(
        address indexed federator,
        bytes32 indexed transactionId,
        address originalTokenAddress,
        address sender,
        address receiver,
        uint256 amount,
        string symbol,
        bytes32 blockHash,
        bytes32 indexed transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity,
        uint256 typeId
    );
    event HeartBeat(
        address indexed sender,
        uint256 fedRskBlock,
        uint256 fedEthBlock,
        string federatorVersion,
        string nodeRskInfo,
        string nodeEthInfo
    );

    modifier onlyMember() {
        require(isMember[_msgSender()], "Federation: Caller not a Federator");
        _;
    }

    modifier validRequirement(uint membersCount, uint _required) {
        // solium-disable-next-line max-len
        require(_required <= membersCount && _required != 0 && membersCount != 0, "Federation: Invalid requirements");
        _;
    }

    constructor(address[] memory _members, uint _required) validRequirement(_members.length, _required) {
        require(_members.length <= MAX_MEMBER_COUNT, "Federation: Members larger than max allowed");
        members = _members;
        for (uint i = 0; i < _members.length; i++) {
            require(!isMember[_members[i]] && _members[i] != NULL_ADDRESS, "Federation: Invalid members");
            isMember[_members[i]] = true;
            emit MemberAddition(_members[i]);
        }
        required = _required;
        emit RequirementChange(required);
    }

    function version() external pure returns (string memory) {
        return "v2";
    }

    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != NULL_ADDRESS, "Federation: Empty bridge");
        bridge = IBridge(_bridge);
        emit BridgeChanged(_bridge);
    }

    function voteTransaction(IBridge.TransactionInfo memory transactionInfo)
    public onlyMember returns(bool)
    {
        bytes32 transactionId = getTransactionId(transactionInfo);
        if (processed[transactionId])
            return true;

        if (votes[transactionId][_msgSender()])
            return true;

        votes[transactionId][_msgSender()] = true;
        emit Voted(
            _msgSender(),
            transactionId,
            transactionInfo.originalTokenAddress,
            transactionInfo.sender,
            transactionInfo.receiver,
            transactionInfo.amount,
            transactionInfo.symbol,
            transactionInfo.blockHash,
            transactionInfo.transactionHash,
            transactionInfo.logIndex,
            transactionInfo.decimals,
            transactionInfo.granularity,
            transactionInfo.typeId
        );

        uint transactionCount = getTransactionCount(transactionId);
        if (transactionCount >= required && transactionCount >= members.length / 2 + 1) {
            processed[transactionId] = true;
            bridge.acceptTransfer(
                transactionInfo
            );
            emit Executed(transactionId);
            return true;
        }

        return true;
    }

    function getTransactionCount(bytes32 transactionId) public view returns(uint) {
        uint count = 0;
        for (uint i = 0; i < members.length; i++) {
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
        IBridge.TransactionInfo memory transactionInfo)
    public pure returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
            transactionInfo.originalTokenAddress,
            transactionInfo.sender,
            transactionInfo.receiver,
            transactionInfo.amount,
            transactionInfo.symbol,
            transactionInfo.blockHash,
            transactionInfo.transactionHash,
            transactionInfo.logIndex,
            transactionInfo.decimals,
            transactionInfo.granularity,
            transactionInfo.typeId
            )
        );
    }

    function addMember(address _newMember) external onlyOwner
    {
        require(_newMember != NULL_ADDRESS, "Federation: Empty member");
        require(!isMember[_newMember], "Federation: Member already exists");
        require(members.length < MAX_MEMBER_COUNT, "Federation: Max members reached");

        isMember[_newMember] = true;
        members.push(_newMember);
        emit MemberAddition(_newMember);
    }

    function removeMember(address _oldMember) external onlyOwner
    {
        require(_oldMember != NULL_ADDRESS, "Federation: Empty member");
        require(isMember[_oldMember], "Federation: Member doesn't exists");
        require(members.length > 1, "Federation: Can't remove all the members");
        require(members.length - 1 >= required, "Federation: Can't have less than required members");

        isMember[_oldMember] = false;
        for (uint i = 0; i < members.length - 1; i++) {
            if (members[i] == _oldMember) {
                members[i] = members[members.length - 1];
                break;
            }
        }
        members.pop(); // remove an element from the end of the array.
        emit MemberRemoval(_oldMember);
    }

    function getMembers() external view returns (address[] memory)
    {
        return members;
    }

    function changeRequirement(uint _required) external onlyOwner validRequirement(members.length, _required)
    {
        require(_required >= 2, "Federation: Requires at least 2");
        required = _required;
        emit RequirementChange(_required);
    }

    function emitHeartbeat(
        uint256 fedRskBlock,
        uint256 fedEthBlock,
        string calldata federatorVersion,
        string calldata nodeRskInfo,
        string calldata nodeEthInfo
    ) external onlyMember {
        emit HeartBeat(
            _msgSender(),
            fedRskBlock,
            fedEthBlock,
            federatorVersion,
            nodeRskInfo,
            nodeEthInfo
        );
    }
}
