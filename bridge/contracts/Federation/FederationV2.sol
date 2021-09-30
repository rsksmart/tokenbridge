// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

// Upgradables
import "../zeppelin/upgradable/Initializable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../Bridge/IBridgeV3.sol";

contract FederationV2 is Initializable, UpgradableOwnable {
    uint constant public MAX_MEMBER_COUNT = 50;
    address constant private NULL_ADDRESS = address(0);

    IBridgeV3 public bridge;
    address[] public members;
    uint public required;

    mapping (address => bool) public isMember;
    mapping (bytes32 => mapping (address => bool)) public votes;
    mapping(bytes32 => bool) public processed;

    event Executed(
        address indexed federator,
        bytes32 indexed transactionHash,
        bytes32 indexed transactionId,
        address originalTokenAddress,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 blockHash,
        uint32 logIndex
    );
    event MemberAddition(address indexed member);
    event MemberRemoval(address indexed member);
    event RequirementChange(uint required);
    event BridgeChanged(address bridge);
    event Voted(
        address indexed federator,
        bytes32 indexed transactionHash,
        bytes32 indexed transactionId,
        address originalTokenAddress,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 blockHash,
        uint32 logIndex
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
        require(isMember[_msgSender()], "Federation: Not Federator");
        _;
    }

    modifier validRequirement(uint membersCount, uint _required) {
        // solium-disable-next-line max-len
        require(_required <= membersCount && _required != 0 && membersCount != 0, "Federation: Invalid requirements");
        _;
    }

    function initialize(address[] memory _members, uint _required, address _bridge, address owner)
    public validRequirement(_members.length, _required) initializer {
        UpgradableOwnable.initialize(owner);
        require(_members.length <= MAX_MEMBER_COUNT, "Federation: Too many members");
        members = _members;
        for (uint i = 0; i < _members.length; i++) {
            require(!isMember[_members[i]] && _members[i] != NULL_ADDRESS, "Federation: Invalid members");
            isMember[_members[i]] = true;
            emit MemberAddition(_members[i]);
        }
        required = _required;
        emit RequirementChange(required);
        _setBridge(_bridge);
    }

    function version() external pure returns (string memory) {
        return "v2";
    }

    function setBridge(address _bridge) external onlyOwner {
        _setBridge(_bridge);
    }

    function _setBridge(address _bridge) internal {
        require(_bridge != NULL_ADDRESS, "Federation: Empty bridge");
        bridge = IBridgeV3(_bridge);
        emit BridgeChanged(_bridge);
    }

    function voteTransaction(
        address originalTokenAddress,
        address payable sender,
        address payable receiver,
        uint256 amount,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    )
    public onlyMember returns(bool)
    {
        bytes32 transactionId = getTransactionId(
            originalTokenAddress,
            sender,
            receiver,
            amount,
            blockHash,
            transactionHash,
            logIndex
        );
        if (processed[transactionId])
            return true;

        if (votes[transactionId][_msgSender()])
            return true;

        votes[transactionId][_msgSender()] = true;
        emit Voted(
            _msgSender(),
            transactionHash,
            transactionId,
            originalTokenAddress,
            sender,
            receiver,
            amount,
            blockHash,
            logIndex
        );

        uint transactionCount = getTransactionCount(transactionId);
        if (transactionCount >= required && transactionCount >= members.length / 2 + 1) {
            processed[transactionId] = true;
            bridge.acceptTransfer(
                originalTokenAddress,
                sender,
                receiver,
                amount,
                blockHash,
                transactionHash,
                logIndex
            );
            emit Executed(
                _msgSender(),
                transactionHash,
                transactionId,
                originalTokenAddress,
                sender,
                receiver,
                amount,
                blockHash,
                logIndex
            );
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
        address originalTokenAddress,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    ) public pure returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
            originalTokenAddress,
            sender,
            receiver,
            amount,
            blockHash,
            transactionHash,
            logIndex
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