// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

// Import base Initializable contract
import "../zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "../zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "../zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../zeppelin/introspection/IERC1820Registry.sol";
import "../zeppelin/token/ERC777/IERC777Recipient.sol";
import "../zeppelin/token/ERC20/IERC20.sol";
import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/utils/Address.sol";
import "../zeppelin/math/SafeMath.sol";
import "../zeppelin/token/ERC777/IERC777.sol";

import "../lib/LibEIP712.sol";
import "../lib/LibUtils.sol";

import "../interface/IBridge.sol";
import "../interface/ISideToken.sol";
import "../interface/ISideTokenFactory.sol";
import "../interface/IAllowTokens.sol";
import "../interface/IWrapped.sol";

// solhint-disable-next-line max-states-count
contract Bridge is Initializable, IBridge, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;
	using Address for address;

	address constant internal NULL_ADDRESS = address(0);
	bytes32 constant internal NULL_HASH = bytes32(0);
	IERC1820Registry constant internal ERC1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

	address internal federation;
	uint256 internal feePercentage;
	string public symbolPrefix;
	// replaces uint256 internal _depprecatedLastDay;
	bytes32 public domainSeparator;
	uint256 internal _deprecatedSpentToday;

	mapping (address => address) public deprecatedMappedTokens; // OriginalToken => SideToken
	mapping (address => address) public deprecatedOriginalTokens; // SideToken => OriginalToken
	mapping (address => bool) public deprecatedKnownTokens; // OriginalToken => true

	// claimed can use the same of bytes32
	mapping (bytes32 => bool) public claimed; // transactionDataHash => true // previously named processed

	IAllowTokens public allowTokens;
	ISideTokenFactory public sideTokenFactory;
	//Bridge_v1 variables
	bool public isUpgrading;
	// Percentage with up to 2 decimals
	uint256 constant public feePercentageDivider = 10000; // solhint-disable-line const-name-snakecase
	//Bridge_v3 variables
	bytes32 constant internal _erc777Interface = keccak256("ERC777Token"); // solhint-disable-line const-name-snakecase
	IWrapped public wrappedCurrency;
	mapping (bytes32 => bytes32) public transactionsDataHashes; // transactionHash => transactionDataHash
	mapping (bytes32 => address) public originalTokenAddresses; // transactionHash => originalTokenAddress
	mapping (bytes32 => address) public senderAddresses; // transactionHash => senderAddress

	// keccak256("Claim(address to,uint256 amount,bytes32 transactionHash,uint256 originChainId,address relayer,uint256 fee,uint256 nonce,uint256 deadline)");
	bytes32 public constant CLAIM_TYPEHASH = 0xaf3ac34fea9cc1b1def33a9bdc482d988feb61b5015ae4a55e2a62bb3600d54c;
	mapping(address => uint) public nonces;

	//Bridge_v4 variables multichain
	mapping (uint256 => mapping(address => address)) public sideTokenByOriginalTokenByChain; // chainId => OriginalToken Address => SideToken Address
	mapping (address => OriginalToken) public originalTokenBySideToken; // SideTokenAddress => struct {}
	mapping (uint256 => mapping(address => bool)) public knownTokenByChain; // chainId => OriginalToken Address => Know

	event AllowTokensChanged(address _newAllowTokens);
	event FederationChanged(address _newFederation);
	event SideTokenFactoryChanged(address _newSideTokenFactory);
	event Upgrading(bool _isUpgrading);
	event WrappedCurrencyChanged(address _wrappedCurrency);

	function initialize(
		address _manager,
		address _federation,
		address _allowTokens,
		address _sideTokenFactory,
		string memory _symbolPrefix
	) public initializer {
		UpgradableOwnable.initialize(_manager);
		UpgradablePausable.__Pausable_init(_manager);
		symbolPrefix = _symbolPrefix;
		allowTokens = IAllowTokens(_allowTokens);
		sideTokenFactory = ISideTokenFactory(_sideTokenFactory);
		federation = _federation;
		//keccak256("ERC777TokensRecipient")
		ERC1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
		initDomainSeparator();
	}

	receive () external payable {
		// The fallback function is needed to use WRBTC
		require(_msgSender() == address(wrappedCurrency), "Bridge: not wrappedCurrency");
	}

	function version() override external pure returns (string memory) {
		return "v4";
	}

	function initDomainSeparator() public {
		domainSeparator = LibEIP712.hashEIP712Domain(
			"RSK Token Bridge",
			"1",
			block.chainid,
			address(this)
		);
	}

	modifier whenNotUpgrading() {
		require(!isUpgrading, "Bridge: Upgrading");
		_;
	}

	function isCurrentChainId(uint256 chainId) private view returns(bool) {
		return chainId == block.chainid;
	}

	function sideTokenByOriginalToken(uint256 chainId, address originalToken) public view returns(address) {
		address sideTokenAddr = sideTokenByOriginalTokenByChain[chainId][originalToken];

		if (sideTokenAddr != NULL_ADDRESS) {
			return sideTokenAddr;
		}

		// specification for retrocompatibility
		return deprecatedMappedTokens[originalToken];
	}

	function setSideTokenByOriginalAddressByChain(uint256 chainId, address originalToken, address sideToken) public onlyOwner {
		sideTokenByOriginalTokenByChain[chainId][originalToken] = sideToken;
	}

	function getOriginalTokenBySideToken(address sideToken) public view returns(OriginalToken memory originalToken) {
		originalToken = originalTokenBySideToken[sideToken];
		if (originalToken.tokenAddress != NULL_ADDRESS) {
			return originalToken;
		}

		// specification for retrocompatibility
		originalToken.originChainId = 1; // ethereum main chain id
		originalToken.tokenAddress = deprecatedOriginalTokens[sideToken];
		return originalToken;
	}

	function setOriginalTokenBySideTokenByChain(address sideToken, OriginalToken memory originalToken) public onlyOwner {
		originalTokenBySideToken[sideToken] = originalToken;
	}

	function knownToken(uint256 chainId, address originalToken) public view returns(bool) {
		bool knowToken = knownTokenByChain[chainId][originalToken];
		if (knowToken) {
			return knowToken;
		}

		// specification for retrocompatibility
		return deprecatedKnownTokens[originalToken];
	}

	function setKnownTokenByChain(uint256 chainId, address originalToken, bool knownTokenValue) public {
		knownTokenByChain[chainId][originalToken] = knownTokenValue;
	}

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
	) external whenNotPaused nonReentrant override {
		require(_msgSender() == federation, "Bridge: Not Federation");
		require(knownToken(_originChainId, _originalTokenAddress) ||
			sideTokenByOriginalToken(_originChainId, _originalTokenAddress) != NULL_ADDRESS,
			"Bridge: Unknown token"
		);
		require(_to != NULL_ADDRESS, "Bridge: Null To");
		require(_amount > 0, "Bridge: Amount 0");
		require(_blockHash != NULL_HASH, "Bridge: Null BlockHash");
		require(_transactionHash != NULL_HASH, "Bridge: Null TxHash");
		require(transactionsDataHashes[_transactionHash] == bytes32(0), "Bridge: Already accepted");

		bytes32 _transactionDataHash = getTransactionDataHash(
			_to,
			_amount,
			_blockHash,
			_transactionHash,
			_logIndex
		);

		bytes32 _transactionDataHashMultichain = getTransactionDataHash(
			_to,
			_amount,
			_blockHash,
			_transactionHash,
			_logIndex,
			_originChainId,
			_destinationChainId
		);
		// Do not remove, claimed also has the previously processed using the older bridge version
		// https://github.com/rsksmart/tokenbridge/blob/TOKENBRIDGE-1.2.0/bridge/contracts/Bridge.sol#L41
		require(!isClaimed(_transactionDataHash, _transactionDataHashMultichain), "Bridge: Already claimed");

		transactionsDataHashes[_transactionHash] = _transactionDataHashMultichain;
		originalTokenAddresses[_transactionHash] = _originalTokenAddress;
		senderAddresses[_transactionHash] = _from;

		emit AcceptedCrossTransfer(
			_transactionHash,
			_originalTokenAddress,
			_to,
			_from,
			_amount,
			_blockHash,
			_logIndex,
			_originChainId,
			_destinationChainId
		);
	}

	function createSideToken(
		uint256 _typeId,
		address _originalTokenAddress,
		uint8 _originalTokenDecimals,
		string calldata _originalTokenSymbol,
		string calldata _originalTokenName,
		uint256 originChainId
	) external onlyOwner override {
		require(_originalTokenAddress != NULL_ADDRESS, "Bridge: Null token");

		address sideToken = sideTokenByOriginalToken(originChainId, _originalTokenAddress);
		require(sideToken == NULL_ADDRESS, "Bridge: Already exists");

		uint256 granularity = LibUtils.decimalsToGranularity(_originalTokenDecimals);
		string memory newSymbol = string(abi.encodePacked(symbolPrefix, _originalTokenSymbol));

		// Create side token
		sideToken = sideTokenFactory.createSideToken(_originalTokenName, newSymbol, granularity);

		setSideTokenByOriginalAddressByChain(originChainId, _originalTokenAddress, sideToken);

		OriginalToken memory originalToken;
		originalToken.originChainId = originChainId;
		originalToken.tokenAddress = _originalTokenAddress;
		setOriginalTokenBySideTokenByChain(sideToken, originalToken);
		allowTokens.setToken(originChainId, sideToken, _typeId);

		emit NewSideToken(sideToken, _originalTokenAddress, newSymbol, granularity, originChainId);
	}

	function claim(ClaimData calldata _claimData) external override returns (uint256 receivedAmount) {
		receivedAmount = _claim(
			_claimData,
			_claimData.to,
			payable(address(0)),
			0
		);
		return receivedAmount;
	}

	function claimFallback(ClaimData calldata _claimData) external override returns (uint256 receivedAmount) {
		require(_msgSender() == senderAddresses[_claimData.transactionHash],"Bridge: invalid sender");
		receivedAmount = _claim(
			_claimData,
			_msgSender(),
			payable(address(0)),
			0
		);
		return receivedAmount;
	}

	function getDigest(
		ClaimData memory _claimData,
		address payable _relayer,
		uint256 _fee,
		uint256 _deadline
	) internal returns (bytes32) {
		return LibEIP712.hashEIP712Message(
			domainSeparator,
			keccak256(
				abi.encode(
					CLAIM_TYPEHASH,
					_claimData.to,
					_claimData.amount,
					_claimData.transactionHash,
					_claimData.originChainId,
					_relayer,
					_fee,
					nonces[_claimData.to]++,
					_deadline
				)
			)
		);
	}

	// Inspired by https://github.com/dapphub/ds-dach/blob/master/src/dach.sol
	function claimGasless(
		ClaimData calldata _claimData,
		address payable _relayer,
		uint256 _fee,
		uint256 _deadline,
		uint8 _v,
		bytes32 _r,
		bytes32 _s
	) external override returns (uint256 receivedAmount) {
		require(_deadline >= block.timestamp, "Bridge: EXPIRED"); // solhint-disable-line not-rely-on-time

		bytes32 digest = getDigest(_claimData, _relayer, _fee, _deadline);
		address recoveredAddress = ecrecover(digest, _v, _r, _s);
		require(_claimData.to != address(0) && recoveredAddress == _claimData.to, "Bridge: INVALID_SIGNATURE");

		return _claim(
			_claimData,
			_claimData.to,
			_relayer,
			_fee
		);
	}

	function isClaimed(bytes32 transactionDataHash, bytes32 transactionDataHashMultichain) public view returns(bool) {
		return claimed[transactionDataHash] || claimed[transactionDataHashMultichain];
	}

	function isClaimed(ClaimData calldata _claimData, bytes32 transactionDataHashMultichain) public view returns(bool) {
		bytes32 transactionDataHash = getTransactionDataHash(
			_claimData.to,
			_claimData.amount,
			_claimData.blockHash,
			_claimData.transactionHash,
			_claimData.logIndex
		);

		return claimed[transactionDataHash] || claimed[transactionDataHashMultichain];
	}

	function _claim(
		ClaimData calldata _claimData,
		address payable _reciever,
		address payable _relayer,
		uint256 _fee
	) internal nonReentrant returns (uint256 receivedAmount) {
		address originalTokenAddress = originalTokenAddresses[_claimData.transactionHash];
		require(originalTokenAddress != NULL_ADDRESS, "Bridge: Tx not crossed");

		bytes32 transactionDataHash = getTransactionDataHash(
			_claimData.to,
			_claimData.amount,
			_claimData.blockHash,
			_claimData.transactionHash,
			_claimData.logIndex,
			_claimData.originChainId,
			block.chainid
		);

		require(transactionsDataHashes[_claimData.transactionHash] == transactionDataHash, "Bridge: Wrong transactionDataHash");
		require(!isClaimed(_claimData, transactionDataHash), "Bridge: Already claimed");
		claimed[transactionDataHash] = true;

		receivedAmount = _claimCross(
			_claimData.originChainId,
			originalTokenAddress,
			_reciever,
			_claimData.amount,
			_relayer,
			_fee
		);

		emitClaimed(_claimData, originalTokenAddress, _reciever, _relayer, _fee);
		return receivedAmount;
	}

	function emitClaimed(
		ClaimData calldata _claimData,
		address originalTokenAddress,
		address payable _reciever,
		address payable _relayer,
		uint256 _fee
	) internal {
		emit Claimed(
			_claimData.transactionHash,
			originalTokenAddress,
			_claimData.to,
			senderAddresses[_claimData.transactionHash],
			_claimData.amount,
			_claimData.blockHash,
			_claimData.logIndex,
			_reciever,
			_relayer,
			_fee,
			_claimData.originChainId,
			block.chainid
		);
	}

	function _claimCross(
		uint256 chainId,
		address originalTokenAddress,
		address payable _reciever,
		uint256 _amount,
		address payable _relayer,
		uint256 _fee
	) internal returns (uint256) {
		if (knownToken(chainId, originalTokenAddress)) {
			return _claimCrossBackToToken(
				originalTokenAddress,
				_reciever,
				_amount,
				_relayer,
				_fee
			);
		}

		return _claimCrossToSideToken(
			sideTokenByOriginalToken(chainId, originalTokenAddress),
			_reciever,
			_amount,
			_relayer,
			_fee
		);
	}

	function _claimCrossToSideToken(
		address sideToken,
		address payable _receiver,
		uint256 _amount,
		address payable _relayer,
		uint256 _fee
	) internal returns (uint256 receivedAmount) {
		require(sideToken != NULL_ADDRESS, "Bridge: side token is null");
		uint256 granularity = IERC777(sideToken).granularity();
		uint256 formattedAmount = _amount.mul(granularity);
		require(_fee <= formattedAmount, "Bridge: fee too high");
		receivedAmount = formattedAmount - _fee;
		ISideToken(sideToken).mint(_receiver, receivedAmount, "", "");
		if (_fee > 0) {
			ISideToken(sideToken).mint(_relayer, _fee, "", "relayer fee");
		}
		return receivedAmount;
	}

	function _claimCrossBackToToken(
		address _originalTokenAddress,
		address payable _receiver,
		uint256 _amount,
		address payable _relayer,
		uint256 _fee
	) internal returns (uint256 receivedAmount) {
		uint256 decimals = LibUtils.getDecimals(_originalTokenAddress);
		//As side tokens are ERC777 they will always have 18 decimals
		uint256 formattedAmount = _amount.div(uint256(10) ** (18 - decimals));
		require(_fee <= formattedAmount, "Bridge: fee too high");
		receivedAmount = formattedAmount - _fee;
		if (address(wrappedCurrency) == _originalTokenAddress) {
			wrappedCurrency.withdraw(formattedAmount);
			_receiver.transfer(receivedAmount);
			if(_fee > 0) {
				_relayer.transfer(_fee);
			}
		} else {
			IERC20(_originalTokenAddress).safeTransfer(_receiver, receivedAmount);
			if(_fee > 0) {
				IERC20(_originalTokenAddress).safeTransfer(_relayer, _fee);
			}
		}
		return receivedAmount;
	}

	/**
		* ERC-20 tokens approve and transferFrom pattern
		* See https://eips.ethereum.org/EIPS/eip-20#transferfrom
		*/
	function receiveTokensTo(uint256 destinationChainId, address tokenToUse, address to, uint256 amount) external override {
		address sender = _msgSender();
		//Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
		IERC20(tokenToUse).safeTransferFrom(sender, address(this), amount);
		crossTokens(tokenToUse, sender, to, amount, "", destinationChainId);
	}

	/**
		* Use network currency and cross it.
		*/
	function depositTo(uint256 chainId, address to) external payable override {
		address sender = _msgSender();
		require(address(wrappedCurrency) != NULL_ADDRESS, "Bridge: wrappedCurrency empty");
		wrappedCurrency.deposit{ value: msg.value }();
		crossTokens(address(wrappedCurrency), sender, to, msg.value, "", chainId);
	}

	function tokensReceived(
		address operator,
		address from,
		address to,
		uint amount,
		bytes calldata userData,
		bytes calldata
	) external override(IBridge, IERC777Recipient) {
		return _tokensReceived(operator, from, to, amount, userData, block.chainid);
	}

	function tokensReceived(
		address operator,
		address from,
		address to,
		uint amount,
		bytes calldata userData,
		uint256 chainId
	) external override(IBridge) {
		return _tokensReceived(operator, from, to, amount, userData, chainId);
	}

	/**
		* ERC-777 tokensReceived hook allows to send tokens to a contract and notify it in a single transaction
		* See https://eips.ethereum.org/EIPS/eip-777#motivation for details
		*/
	function _tokensReceived(
		address operator,
		address from,
		address to,
		uint amount,
		bytes calldata userData,
		uint256 chainId
	) public {
		//Hook from ERC777address
		if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
		require(to == address(this), "Bridge: Not to this address");
		address tokenToUse = _msgSender();
		require(ERC1820.getInterfaceImplementer(tokenToUse, _erc777Interface) != NULL_ADDRESS, "Bridge: Not ERC777 token");
		require(userData.length != 0 || !from.isContract(), "Bridge: Specify receiver address in data");
		address receiver = userData.length == 0 ? from : LibUtils.bytesToAddress(userData);
		crossTokens(tokenToUse, from, receiver, amount, userData, chainId);
	}

	function crossTokens(
		address tokenToUse,
		address from,
		address to,
		uint256 amount,
		bytes memory userData,
		uint256 destinationChainId
	) internal whenNotUpgrading whenNotPaused nonReentrant {
		setKnownTokenByChain(destinationChainId, tokenToUse, true);
		uint256 fee = amount.mul(feePercentage).div(feePercentageDivider);
		uint256 amountMinusFees = amount.sub(fee);
		uint8 decimals = LibUtils.getDecimals(tokenToUse);
		uint formattedAmount = amount;
		if (decimals != 18) {
			formattedAmount = amount.mul(uint256(10)**(18-decimals));
		}
		// We consider the amount before fees converted to 18 decimals to check the limits
		// updateTokenTransfer revert if token not allowed
		allowTokens.updateTokenTransfer(destinationChainId, tokenToUse, formattedAmount);

		OriginalToken memory sideToken = getOriginalTokenBySideToken(tokenToUse);
		if (sideToken.tokenAddress != NULL_ADDRESS) {
			// Side Token Crossing back
			uint256 granularity = LibUtils.getGranularity(tokenToUse);
			uint256 modulo = amountMinusFees.mod(granularity);
			fee = fee.add(modulo);
			amountMinusFees = amountMinusFees.sub(modulo);
			IERC777(tokenToUse).burn(amountMinusFees, userData);
			emit Cross(
				sideToken.tokenAddress,
				from,
				to,
				amountMinusFees,
				userData,
				destinationChainId,
				block.chainid
			);
		} else {
			emit Cross(
				tokenToUse,
				from,
				to,
				amountMinusFees,
				userData,
				block.chainid,
				destinationChainId
			);
		}

		if (fee > 0) {
			//Send the payment to the MultiSig of the Federation
			IERC20(tokenToUse).safeTransfer(owner(), fee);
		}
	}

	// function for retrocompatibility
	function getTransactionDataHash(
		address _to,
		uint256 _amount,
		bytes32 _blockHash,
		bytes32 _transactionHash,
		uint32 _logIndex
	) internal pure returns(bytes32) {
		return keccak256(abi.encodePacked(_blockHash, _transactionHash, _to, _amount, _logIndex));
	}

	function getTransactionDataHash(
		address _to,
		uint256 _amount,
		bytes32 _blockHash,
		bytes32 _transactionHash,
		uint32 _logIndex,
		uint256 _originChainId,
		uint256	_destinationChainId
	) public pure override returns(bytes32) {
		return keccak256(abi.encodePacked(_blockHash, _transactionHash, _to, _amount, _logIndex, _originChainId, _destinationChainId));
	}

	function setFeePercentage(uint amount) external onlyOwner {
		require(amount < (feePercentageDivider/10), "Bridge: bigger than 10%");
		feePercentage = amount;
		emit FeePercentageChanged(feePercentage);
	}

	function getFeePercentage() external view override returns(uint) {
		return feePercentage;
	}

	function changeFederation(address newFederation) external onlyOwner {
		require(newFederation != NULL_ADDRESS, "Bridge: Federation is empty");
		federation = newFederation;
		emit FederationChanged(federation);
	}

	function changeAllowTokens(address newAllowTokens) external onlyOwner {
		require(newAllowTokens != NULL_ADDRESS, "Bridge: AllowTokens is empty");
		allowTokens = IAllowTokens(newAllowTokens);
		emit AllowTokensChanged(newAllowTokens);
	}

	function getFederation() external view returns(address) {
		return federation;
	}

	function changeSideTokenFactory(address newSideTokenFactory) external onlyOwner {
		require(newSideTokenFactory != NULL_ADDRESS, "Bridge: SideTokenFactory is empty");
		sideTokenFactory = ISideTokenFactory(newSideTokenFactory);
		emit SideTokenFactoryChanged(newSideTokenFactory);
	}

	function setUpgrading(bool _isUpgrading) external onlyOwner {
		isUpgrading = _isUpgrading;
		emit Upgrading(isUpgrading);
	}

	function setWrappedCurrency(address _wrappedCurrency) external onlyOwner {
		require(_wrappedCurrency != NULL_ADDRESS, "Bridge: wrapp is empty");
		wrappedCurrency = IWrapped(_wrappedCurrency);
		emit WrappedCurrencyChanged(_wrappedCurrency);
	}

	function hasCrossed(bytes32 transactionHash) public view returns (bool) {
		return transactionsDataHashes[transactionHash] != bytes32(0);
	}

	function hasBeenClaimed(bytes32 transactionHash) public view returns (bool) {
		return claimed[transactionsDataHashes[transactionHash]];
	}

}
