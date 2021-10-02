// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

// Upgradables
import "../zeppelin/upgradable/Initializable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../nftbridge/INFTBridge.sol";
import "../interface/IBridge.sol";
import "../interface/IFederation.sol";

contract Federation is Initializable, UpgradableOwnable, IFederation {
	uint constant public MAX_MEMBER_COUNT = 50;
	address constant private NULL_ADDRESS = address(0);

	IBridge public bridge;
	address[] public members;

	/**
		@notice The minimum amount of votes to approve a transaction
		@dev It should have more members than the required amount
		*/
	uint public required;

	/**
		@notice All the addresses that are members of the federation
		@dev The address should be a member to vote in transactions
		*/
	mapping (address => bool) public isMember;

	/**
		(bytes32) transactionId = keccak256(
			abi.encodePacked(
				originalTokenAddress,
				sender,
				receiver,
				amount,
				blockHash,
				transactionHash,
				logIndex
			)
		) => (
			(address) members => (bool) voted
		)
		@notice Votes by members by the transaction ID
		@dev usually the members should approve the transaction by 50% + 1
		*/
	mapping (bytes32 => mapping (address => bool)) public votes;

	/**
		(bytes32) transactionId => (bool) voted
		@notice Check if that transaction was already processed
		*/
	mapping(bytes32 => bool) public processed;

	/** Federator v3 variables */
	INFTBridge public bridgeNFT;

	modifier onlyMember() {
		require(isMember[_msgSender()], "Federation: Not Federator");
		_;
	}

	modifier validRequirement(uint membersCount, uint _required) {
		require(_required <= membersCount && _required != 0 && membersCount != 0, "Federation: Invalid requirements");
		_;
	}

	function initialize(
		address[] memory _members,
		uint _required,
		address _bridge,
		address owner,
		address _bridgeNFT
	) public validRequirement(_members.length, _required) initializer {
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
		_setNFTBridge(_bridgeNFT);
	}

	/**
		@notice Current version of the contract
		@return version in v{Number}
		*/
	function version() external pure override returns (string memory) {
		return "v4";
	}

	/**
		@notice Sets a new bridge contract
		@dev Emits BridgeChanged event
		@param _bridge the new bridge contract address that should implement the IBridge interface
		*/
	function setBridge(address _bridge) external onlyOwner override {
		_setBridge(_bridge);
	}

	function _setBridge(address _bridge) internal {
		require(_bridge != NULL_ADDRESS, "Federation: Empty bridge");
		bridge = IBridge(_bridge);
		emit BridgeChanged(_bridge);
	}

	/**
		@notice Sets a new NFT bridge contract
		@dev Emits NFTBridgeChanged event
		@param _bridgeNFT the new NFT bridge contract address that should implement the INFTBridge interface
		*/
	function setNFTBridge(address _bridgeNFT) external onlyOwner override {
		_setNFTBridge(_bridgeNFT);
	}

	function _setNFTBridge(address _bridgeNFT) internal {
		require(_bridgeNFT != NULL_ADDRESS, "Federation: Empty NFT bridge");
		bridgeNFT = INFTBridge(_bridgeNFT);
		emit NFTBridgeChanged(_bridgeNFT);
	}

	function validateTransaction(bytes32 transactionId, bytes32 transactionIdMultichain) internal view returns(bool) {
		uint256 minimumVotes = getMinimalNumberOfVotes();
		uint256 amountVotes = 0;

    for (uint256 i = 0; i < members.length; i++) {
      if (votes[transactionIdMultichain][members[i]]) {
        amountVotes += 1;
			} else if (votes[transactionId][members[i]]) {
        amountVotes += 1;
			}

			if (amountVotes >= minimumVotes && amountVotes >= required) {
				return true;
			}
    }

		return false;
	}

	function getMinimalNumberOfVotes() internal view returns(uint256) {
		return members.length / 2 + 1;
	}

	function isProcessed(bytes32 transactionId, bytes32 transactionIdMultichain) public view returns(bool) {
		return processed[transactionId] || processed[transactionIdMultichain];
	}

	function isVoted(bytes32 transactionId, bytes32 transactionIdMultichain) public view returns(bool) {
		return votes[transactionId][_msgSender()] || votes[transactionIdMultichain][_msgSender()];
	}

	/**
		@notice Vote in a transaction, if it has enough votes it accepts the transfer
		@param originalTokenAddress The address of the token in the origin (main) chain
		@param sender The address who solicited the cross token
		@param receiver Who is going to receive the token in the opposite chain
		@param value Could be the amount if tokenType == COIN or the tokenId if tokenType == NFT
		@param blockHash The block hash in which the transaction with the cross event occurred
		@param transactionHash The transaction in which the cross event occurred
		@param logIndex Index of the event in the logs
		@param tokenType Is the type of bridge to be used
		@param chainId Is chainId to check of the correct chain
		*/
	function voteTransaction(
		address originalTokenAddress,
		address payable sender,
		address payable receiver,
		uint256 value,
		bytes32 blockHash,
		bytes32 transactionHash,
		uint32 logIndex,
		TokenType tokenType,
		uint256 chainId
	) external onlyMember override {
		bytes32 transactionId = keccak256(
			abi.encodePacked(
				originalTokenAddress,
				sender,
				receiver,
				value,
				blockHash,
				transactionHash,
				logIndex
			)
		);

		bytes32 transactionIdMultichain = getTransactionId(
			originalTokenAddress,
			sender,
			receiver,
			value,
			blockHash,
			transactionHash,
			logIndex,
			chainId
		);

		if (isProcessed(transactionId, transactionIdMultichain))
			return;

		if (isVoted(transactionId, transactionIdMultichain))
			return;

		votes[transactionIdMultichain][_msgSender()] = true;
		emit Voted(
			_msgSender(),
			transactionHash,
			transactionIdMultichain,
			originalTokenAddress,
			sender,
			receiver,
			value,
			blockHash,
			logIndex,
			chainId
		);

		if (validateTransaction(transactionId, transactionIdMultichain)) {
			processed[transactionIdMultichain] = true;
			acceptTransfer(
				originalTokenAddress,
				sender,
				receiver,
				value,
				blockHash,
				transactionHash,
				logIndex,
				tokenType,
				chainId
			);

			emit Executed(
				_msgSender(),
				transactionHash,
				transactionIdMultichain,
				originalTokenAddress,
				sender,
				receiver,
				value,
				blockHash,
				logIndex,
				chainId
			);
			return;
		}
	}

  function acceptTransfer(
    address originalTokenAddress,
    address payable sender,
    address payable receiver,
    uint256 value,
    bytes32 blockHash,
    bytes32 transactionHash,
    uint32 logIndex,
    TokenType tokenType,
		uint256 chainId
  ) internal {
    if (tokenType == TokenType.NFT) {
      require(address(bridgeNFT) != NULL_ADDRESS, "Federation: Empty NFTBridge");
      bridgeNFT.acceptTransfer(
        originalTokenAddress,
        sender,
        receiver,
        value,
        blockHash,
        transactionHash,
        logIndex
      );
      return;
    }

    bridge.acceptTransfer(
      originalTokenAddress,
      sender,
      receiver,
      value,
      blockHash,
      transactionHash,
      logIndex,
			chainId
    );
  }

  /**
    @notice Get the amount of approved votes for that transactionId
    @param transactionId The transaction hashed from getTransactionId function
   */
  function getTransactionCount(bytes32 transactionId) public view returns(uint) {
    uint count = 0;
    for (uint i = 0; i < members.length; i++) {
      if (votes[transactionId][members[i]])
        count += 1;
    }
    return count;
  }

	function hasVoted(bytes32 transactionId) external view returns(bool) {
		return votes[transactionId][_msgSender()];
	}

	function transactionWasProcessed(bytes32 transactionId) external view returns(bool) {
		return processed[transactionId];
	}

	/**
		@notice Gets the hash of transaction from the following parameters encoded and keccaked
		@dev It encodes and applies keccak256 to the parameters received in the same order
		@param originalTokenAddress The address of the token in the origin (main) chain
		@param sender The address who solicited the cross token
		@param receiver Who is going to receive the token in the opposite chain
		@param amount Could be the amount or the tokenId
		@param blockHash The block hash in which the transaction with the cross event occurred
		@param transactionHash The transaction in which the cross event occurred
		@param logIndex Index of the event in the logs
		@param chainId chainId of the chain
		@return The hash generated by the parameters.
	*/
	function getTransactionId(
		address originalTokenAddress,
		address sender,
		address receiver,
		uint256 amount,
		bytes32 blockHash,
		bytes32 transactionHash,
		uint32 logIndex,
		uint256 chainId
	) public pure returns(bytes32) {
		return keccak256(
			abi.encodePacked(
				originalTokenAddress,
				sender,
				receiver,
				amount,
				blockHash,
				transactionHash,
				logIndex,
				chainId
			)
		);
	}

	function addMember(address _newMember) external onlyOwner override {
		require(_newMember != NULL_ADDRESS, "Federation: Empty member");
		require(!isMember[_newMember], "Federation: Member already exists");
		require(members.length < MAX_MEMBER_COUNT, "Federation: Max members reached");

		isMember[_newMember] = true;
		members.push(_newMember);
		emit MemberAddition(_newMember);
	}

	function removeMember(address _oldMember) external onlyOwner override {
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

	/**
		@notice Return all the current members of the federation
		@return Current members
		*/
	function getMembers() external view override returns (address[] memory) {
		return members;
	}

	/**
		@notice Changes the number of required members to vote and approve an transaction
		@dev Emits the RequirementChange event
		@param _required the number of minimum members to approve an transaction, it has to be bigger than 1
		*/
	function changeRequirement(uint _required) external onlyOwner validRequirement(members.length, _required) override {
		require(_required >= 2, "Federation: Requires at least 2");
		required = _required;
		emit RequirementChange(_required);
	}

	/**
		@notice It emits an HeartBeat like an health check
		@dev Emits HeartBeat event
		*/
	function emitHeartbeat(
		uint256 fedRskBlock,
		uint256 fedEthBlock,
		string calldata federatorVersion,
		string calldata nodeRskInfo,
		string calldata nodeEthInfo
	) external onlyMember override {
		emit HeartBeat(
			_msgSender(),
			fedRskBlock,
			fedEthBlock,
			federatorVersion,
			nodeRskInfo,
			nodeEthInfo,
			block.chainid
		);
	}
}
