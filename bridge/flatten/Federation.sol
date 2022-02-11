// Dependency file: contracts/zeppelin/upgradable/Initializable.sol

// SPDX-License-Identifier: MIT

// pragma solidity ^0.8.0;
pragma abicoder v2;

/**
 * @title Initializable
 *
 * @dev Helper contract to support initializer functions. To use it, replace
 * the constructor with a function that has the `initializer` modifier.
 * WARNING: Unlike constructors, initializer functions must be manually
 * invoked. This applies both to deploying an Initializable contract, as well
 * as extending an Initializable contract via inheritance.
 * WARNING: When used with inheritance, manual care must be taken to not invoke
 * a parent initializer twice, or ensure that all initializers are idempotent,
 * because this is not dealt with automatically as with constructors.
 */
contract Initializable {

  /**
   * @dev Indicates that the contract has been initialized.
   */
  bool private initialized;

  /**
   * @dev Indicates that the contract is in the process of being initialized.
   */
  bool private initializing;

  /**
   * @dev Modifier to use in the initializer function of a contract.
   */
  modifier initializer() {
    require(initializing || !initialized, "Contract instance is already initialized");

    bool isTopLevelCall = !initializing;
    if (isTopLevelCall) {
      initializing = true;
      initialized = true;
    }

    _;

    if (isTopLevelCall) {
      initializing = false;
    }
  }

  // Reserved storage space to allow for layout changes in the future.
  uint256[50] private ______gap;
}

// Dependency file: contracts/zeppelin/GSN/Context.sol


// pragma solidity ^0.8.0;
pragma abicoder v2;

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract  Context {

    function _msgSender() internal view returns (address payable) {
        return payable(msg.sender);
    }

    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}


// Dependency file: contracts/zeppelin/upgradable/ownership/UpgradableOwnable.sol


// pragma solidity ^0.8.0;
pragma abicoder v2;

// import "contracts/zeppelin/upgradable/Initializable.sol";

// import "contracts/zeppelin/GSN/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be aplied to your functions to restrict their use to
 * the owner.
 */
contract UpgradableOwnable is Initializable, Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function initialize(address sender) public initializer {
        _owner = sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

}


// Dependency file: contracts/nftbridge/INFTBridge.sol


// pragma solidity ^0.8.0;
pragma abicoder v2;

interface INFTBridge {

  struct NFTClaimData {
    address payable to;
    address from;
    uint256 tokenId;
    address tokenAddress;
    bytes32 blockHash;
    bytes32 transactionHash;
    uint32 logIndex;
    uint256 originChainId;
  }

	struct OriginalNft {
		address nftAddress;
		uint256 originChainId;
	}

  function version() external pure returns (string memory);

  function getFixedFee() external view returns (uint256);

  function receiveTokensTo(
    address tokenAddress,
    address to,
    uint256 tokenId,
    uint256 destinationChainId
  ) external payable;

  /**
    * Accepts the transaction from the other chain that was voted and sent by the Federation contract
    */
  function acceptTransfer(
    address _originalTokenAddress,
    address payable _from,
    address payable _to,
    uint256 _tokenId,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex,
    uint256 _originChainId,
	  uint256	_destinationChainId
  ) external;

  /**
    * Claims the crossed transaction using the hash, this sends the token to the address specified in the claim data
    */
  function claim(NFTClaimData calldata _claimData) external;

  function claimFallback(NFTClaimData calldata _claimData) external;

  function getTransactionDataHash(
    address _to,
    address _from,
    uint256 _tokenId,
    address _tokenAddress,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex,
    uint256 _originChainId,
		uint256	_destinationChainId
  ) external returns (bytes32);

  event Cross(
    address indexed _originalTokenAddress,
    address indexed _to,
    uint256 indexed _destinationChainId,
    address _from,
    uint256 _originChainId,
    address _tokenCreator,
    uint256 _totalSupply,
    uint256 _tokenId,
    string _tokenURI,
    bytes _userData
  );

  event NewSideNFTToken(
    address indexed _newSideNFTTokenAddress,
    address indexed _originalTokenAddress,
    string _newSymbol,
    uint256 originChainId
  );
  event AcceptedNFTCrossTransfer(
    bytes32 indexed _transactionHash,
    address indexed _originalTokenAddress,
    address indexed _to,
    address _from,
    uint256 _tokenId,
    bytes32 _blockHash,
    uint256 _logIndex,
    uint256 _originChainId,
	  uint256	_destinationChainId
  );
  event FixedFeeNFTChanged(uint256 _amount);
  event ClaimedNFTToken(
    bytes32 indexed _transactionHash,
    address indexed _originalTokenAddress,
    address indexed _to,
    address _sender,
    uint256 _tokenId,
    bytes32 _blockHash,
    uint256 _logIndex,
    address _receiver,
    uint256 _originChainId,
	  uint256	_destinationChainId
  );
}


// Dependency file: contracts/interface/IBridge.sol


// pragma solidity ^0.8.0;
pragma abicoder v2;
interface IBridge {

	struct ClaimData {
		address payable to;
		uint256 amount;
		bytes32 blockHash;
		bytes32 transactionHash;
		uint32 logIndex;
		uint256 originChainId;
	}

	struct OriginalToken {
		address tokenAddress;
		uint256 originChainId;
	}

	function version() external pure returns (string memory);

	function getFeePercentage() external view returns(uint);

	/**
		* ERC-20 tokens approve and transferFrom pattern
		* See https://eips.ethereum.org/EIPS/eip-20#transferfrom
		*/
	function receiveTokensTo(uint256 chainId, address tokenToUse, address to, uint256 amount) external;

	/**
		* Use network currency and cross it.
		*/
	function depositTo(uint256 chainId, address to) external payable;

	/**
		* ERC-777 tokensReceived hook allows to send tokens to a contract and notify it in a single transaction
		* See https://eips.ethereum.org/EIPS/eip-777#motivation for details
		* @param userData it can be 2 options in the first one you can send the receiver and the chain id of the destination
		* const userData = web3.eth.abi.encodeParameters(
    *   ["address", "uint256"],
    *   [anAccount.toLowerCase(), chains.ETHEREUM_MAIN_NET_CHAIN_ID]
    * );
		* or you also can send only the destination chain id, and the receiver would be the same as the from parameter
		* const userData = web3.eth.abi.encodeParameters(["uint256"], [chains.ETHEREUM_MAIN_NET_CHAIN_ID]);
		*/
	function tokensReceived (
		address operator,
		address from,
		address to,
		uint amount,
		bytes calldata userData,
		bytes calldata operatorData
	) external;

	/**
		* Accepts the transaction from the other chain that was voted and sent by the Federation contract
		*/
	function acceptTransfer(
		address _originalTokenAddress,
		address payable _from,
		address payable _to,
		uint256 _amount,
		bytes32 _blockHash,
		bytes32 _transactionHash,
		uint32 _logIndex,
		uint256 _originChainId,
		uint256	_destinationChainId
	) external;

	/**
		* Claims the crossed transaction using the hash, this sends the funds to the address indicated in
		*/
	function claim(ClaimData calldata _claimData) external returns (uint256 receivedAmount);

	function claimFallback(ClaimData calldata _claimData) external returns (uint256 receivedAmount);

	function claimGasless(
		ClaimData calldata _claimData,
		address payable _relayer,
		uint256 _fee,
		uint256 _deadline,
		uint8 _v,
		bytes32 _r,
		bytes32 _s
	) external returns (uint256 receivedAmount);

	function createSideToken(
		uint256 _typeId,
		address _originalTokenAddress,
		uint8 _originalTokenDecimals,
		string calldata _originalTokenSymbol,
		string calldata _originalTokenName,
		uint256 _chainId
	) external;

	function getTransactionDataHash(
		address _to,
		uint256 _amount,
		bytes32 _blockHash,
		bytes32 _transactionHash,
		uint32 _logIndex,
		uint256 _originChainId,
		uint256 _destinationChainId
	) external returns(bytes32);

	event Cross(
		address indexed _tokenAddress,
		address indexed _to,
		uint256 indexed _destinationChainId,
		address _from,
		uint256 _originChainId,
		uint256 _amount,
		bytes _userData
	);

	event NewSideToken(
		address indexed _newSideTokenAddress,
		address indexed _originalTokenAddress,
		string _newSymbol,
		uint256 _granularity,
		uint256 _chainId
	);
	event AcceptedCrossTransfer(
		bytes32 indexed _transactionHash,
		address indexed _originalTokenAddress,
		address indexed _to,
		address  _from,
		uint256 _amount,
		bytes32 _blockHash,
		uint256 _logIndex,
		uint256 _originChainId,
		uint256	_destinationChainId
	);
	event FeePercentageChanged(uint256 _amount);
	event Claimed(
		bytes32 indexed _transactionHash,
		address indexed _originalTokenAddress,
		address indexed _to,
		address _sender,
		uint256 _amount,
		bytes32 _blockHash,
		uint256 _logIndex,
		address _reciever,
		address _relayer,
		uint256 _fee,
		uint256 _destinationChainId,
		uint256 _originChainId
	);
}

// Dependency file: contracts/interface/IFederation.sol

// pragma solidity ^0.8.0;
pragma abicoder v2;

interface IFederation {
  enum TokenType{ COIN, NFT }

  /**
    @notice Current version of the contract
    @return version in v{Number}
    */
  function version() external pure returns (string memory);

  /**
    @notice Sets a new bridge contract
    @param _bridge the new bridge contract address that should implement the IBridge interface
  */
  function setBridge(address _bridge) external;

  /**
    @notice Sets a new NFT bridge contract
    @param _bridgeNFT the new NFT bridge contract address that should implement the INFTBridge interface
  */
  function setNFTBridge(address _bridgeNFT) external;

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
		@param originChainId Is chainId of the original chain
		@param destinationChainId Is chainId of the destination chain
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
	  uint256 originChainId,
	  uint256	destinationChainId
  ) external;

  /**
    @notice Add a new member to the federation
    @param _newMember address of the new member
  */
  function addMember(address _newMember) external;

  /**
    @notice Remove a member of the federation
    @param _oldMember address of the member to be removed from federation
  */
  function removeMember(address _oldMember) external;

  /**
    @notice Return all the current members of the federation
    @return Current members
  */
  function getMembers() external view returns (address[] memory);

  /**
    @notice Changes the number of required members to vote and approve an transaction
    @param _required the number of minimum members to approve an transaction, it has to be bigger than 1
  */
  function changeRequirement(uint _required) external;

  /**
    @notice It emmits an HeartBeat like an healthy check
  */
  function emitHeartbeat(
    string calldata federatorVersion,
		uint256[] calldata fedChainsIds,
		uint256[] calldata fedChainsBlocks,
		string[] calldata fedChainsInfo
  ) external;

  event Executed(
    address indexed federator,
    bytes32 indexed transactionHash,
    bytes32 indexed transactionId,
    address originalTokenAddress,
    address sender,
    address receiver,
    uint256 amount,
    bytes32 blockHash,
    uint32 logIndex,
		uint256 originChainId,
		uint256	destinationChainId
  );
  event MemberAddition(address indexed member);
  event MemberRemoval(address indexed member);
  event RequirementChange(uint required);
  event BridgeChanged(address bridge);
  event NFTBridgeChanged(address bridgeNFT);
  event Voted(
    address indexed federator,
    bytes32 indexed transactionHash,
    bytes32 indexed transactionId,
    address originalTokenAddress,
    address sender,
    address receiver,
    uint256 amount,
    bytes32 blockHash,
    uint32 logIndex,
    uint256 originChainId,
		uint256	destinationChainId
  );
  event HeartBeat(
    address indexed sender,
    uint256 currentChainId,
    uint256 currentBlock,
    string fedVersion,
    uint256[] fedChainsIds,
		uint256[] fedChainsBlocks,
		string[] fedChainsInfo
  );

}


// Root file: contracts/federation/Federation.sol


pragma solidity ^0.8.0;
pragma abicoder v2;

// Upgradables
// import "contracts/zeppelin/upgradable/Initializable.sol";
// import "contracts/zeppelin/upgradable/ownership/UpgradableOwnable.sol";

// import "contracts/nftbridge/INFTBridge.sol";
// import "contracts/interface/IBridge.sol";
// import "contracts/interface/IFederation.sol";
contract Federation is Initializable, UpgradableOwnable, IFederation {
	uint constant public MAX_MEMBER_COUNT = 50;
	address constant private NULL_ADDRESS = address(0);

	IBridge public bridge;
	address[] public members;

	/**
		@notice The minimum amount of votes to approve a transaction
		@dev It should have at least the required amount of members
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
		@dev the members should approve the transaction by 50% + 1
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
		address[] calldata _members,
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
		return "v3";
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
		require(_bridgeNFT != NULL_ADDRESS, "Federation: Empty NFT bridge");
		_setNFTBridge(_bridgeNFT);
	}

	function _setNFTBridge(address _bridgeNFT) internal {
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
		return processed[transactionIdMultichain] || processed[transactionId];
	}

	function isVoted(bytes32 transactionId, bytes32 transactionIdMultichain) public view returns(bool) {
		return votes[transactionIdMultichain][_msgSender()] || votes[transactionId][_msgSender()];
	}

	function shouldBeCurrentChainId(uint256 chainId) internal view {
		require(chainId == block.chainid, "Federation: Not block.chainid");
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
		@param originChainId Is chainId of the original chain
		@param destinationChainId Is chainId of the destination chain
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
		uint256 originChainId,
		uint256	destinationChainId
	) external onlyMember override {
		shouldBeCurrentChainId(destinationChainId);
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
			originChainId,
			destinationChainId
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
			originChainId,
			destinationChainId
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
				originChainId,
				destinationChainId
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
				originChainId,
				destinationChainId
			);
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
	uint256 originChainId,
	uint256	destinationChainId
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
        logIndex,
		originChainId,
		destinationChainId
      );
    } else {
	  bridge.acceptTransfer(
		originalTokenAddress,
		sender,
		receiver,
		value,
		blockHash,
		transactionHash,
		logIndex,
		originChainId,
		destinationChainId
	  );
	}
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
		@param originChainId Is chainId of the original chain
		@param destinationChainId Is chainId of the destination chain
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
		uint256 originChainId,
		uint256	destinationChainId
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
				originChainId,
				destinationChainId
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
		string calldata fedVersion,
		uint256[] calldata fedChainsIds,
		uint256[] calldata fedChainsBlocks,
		string[] calldata fedChainsInfo
	) external onlyMember override {
		require(fedChainsIds.length == fedChainsBlocks.length &&
			fedChainsIds.length == fedChainsInfo.length, "Federation: Length missmatch");
		emit HeartBeat(
			_msgSender(),
			block.chainid,
			block.number,
			fedVersion,
			fedChainsIds,
			fedChainsBlocks,
			fedChainsInfo
		);
	}
}
