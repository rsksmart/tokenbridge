// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../zeppelin/math/SafeMath.sol";
// Upgradables
import "../zeppelin/upgradable/Initializable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";
import "../zeppelin/upgradable/ownership/UpgradableSecondary.sol";

import "../interface/IAllowTokens.sol";

contract AllowTokens is Initializable, UpgradableOwnable, UpgradableSecondary, IAllowTokens {
	using SafeMath for uint256;

	address constant private NULL_ADDRESS = address(0);
	uint256 constant public MAX_TYPES = 250;
	mapping (address => TokenInfo) public deprecatedAllowedTokens; // use tokenInfoByTokenAddressByChain instead
	mapping (uint256 => Limits) public typeLimits;
	uint256 public smallAmountConfirmations;
	uint256 public mediumAmountConfirmations;
	uint256 public largeAmountConfirmations;
	string[] public typeDescriptions;

	// v2 multichain variables
	mapping (uint256 => mapping (address => TokenInfo)) public tokenInfoByTokenAddressByChain;

	event SetToken(uint256 chainId, address indexed _tokenAddress, uint256 _typeId);
	event AllowedTokenRemoved(uint256 chainId, address indexed _tokenAddress);
	event TokenTypeAdded(uint256 indexed _typeId, string _typeDescription);
	event TypeLimitsChanged(uint256 indexed _typeId, Limits limits);
	event UpdateTokensTransfered(uint256 chainId, address indexed _tokenAddress, uint256 _lastDay, uint256 _spentToday);
	event ConfirmationsChanged(uint256 _smallAmountConfirmations, uint256 _mediumAmountConfirmations, uint256 _largeAmountConfirmations);

	modifier notNull(address _address) {
		require(_address != NULL_ADDRESS, "AllowTokens: Null Address");
		_;
	}

	function initialize(
		address _manager,
		address _primary,
		uint256 _smallAmountConfirmations,
		uint256 _mediumAmountConfirmations,
		uint256 _largeAmountConfirmations,
		TypeInfo[] memory typesInfo) public initializer {
		UpgradableOwnable.initialize(_manager);
		UpgradableSecondary.__Secondary_init(_primary);
		_setConfirmations(_smallAmountConfirmations, _mediumAmountConfirmations, _largeAmountConfirmations);
		for(uint i = 0; i < typesInfo.length; i = i + 1) {
			_addTokenType(typesInfo[i].description, typesInfo[i].limits);
		}
	}

	function version() override external pure returns (string memory) {
		return "v2";
	}

	function tokenInfo(uint256 chainId, address tokenAddress) public view returns(TokenInfo memory) {
		return tokenInfoByTokenAddressByChain[chainId][tokenAddress];
	}

	function setTokenInfoByTokenAddress(uint256 chainId, address tokenAddress, TokenInfo memory info) public {
		require(isOwner() || _msgSender() == primary(), "AllowTokens: unauthorized sender");
		tokenInfoByTokenAddressByChain[chainId][tokenAddress] = info;
	}

	function getInfoAndLimits(
		uint256 chainId,
		address tokenAddress
	) public view override returns (
		TokenInfo memory info,
		Limits memory limit
	) {
		info = tokenInfo(chainId, tokenAddress);
		limit = typeLimits[info.typeId];
		return (info, limit);
	}

	function calcMaxWithdraw(uint256 chainId, address token) public view override returns (uint256 maxWithdraw) {
		(TokenInfo memory info, Limits memory limits) = getInfoAndLimits(chainId, token);
		return _calcMaxWithdraw(info, limits);
	}

	function _calcMaxWithdraw(TokenInfo memory info, Limits memory limits) private view returns (uint256 maxWithdraw) {
		// solium-disable-next-line security/no-block-members
		if (block.timestamp > info.lastDay + 24 hours) { // solhint-disable-line not-rely-on-time
			info.spentToday = 0;
		}
		if (limits.daily <= info.spentToday) {
			return 0;
		}
		maxWithdraw = limits.daily - info.spentToday;
		if (maxWithdraw > limits.max) {
			maxWithdraw = limits.max;
		}
		return maxWithdraw;
	}

	function updateTokenTransfer(uint256 chainId, address token, uint256 amount) override external onlyPrimary {
		(TokenInfo memory info, Limits memory limit) = getInfoAndLimits(chainId, token);
		require(isTokenAllowed(chainId, token), "AllowTokens: Not whitelisted");
		require(amount >= limit.min, "AllowTokens: Lower than limit");

		// solium-disable-next-line security/no-block-members
		if (block.timestamp > info.lastDay + 24 hours) { // solhint-disable-line not-rely-on-time
			// solium-disable-next-line security/no-block-members
			info.lastDay = block.timestamp; // solhint-disable-line not-rely-on-time
			info.spentToday = 0;
		}
		uint maxWithdraw = _calcMaxWithdraw(info, limit);
		require(amount <= maxWithdraw, "AllowTokens: Exceeded limit");
		info.spentToday = info.spentToday.add(amount);
		setTokenInfoByTokenAddress(chainId, token, info);

		emit UpdateTokensTransfered(chainId, token, info.lastDay, info.spentToday);
	}

	function _addTokenType(string memory description, Limits memory limits) private returns(uint256 len) {
		require(bytes(description).length > 0, "AllowTokens: Empty description");
		len = typeDescriptions.length;
		require(len + 1 <= MAX_TYPES, "AllowTokens: Reached MAX_TYPES");
		typeDescriptions.push(description);
		_setTypeLimits(len, limits);
		emit TokenTypeAdded(len, description);
		return len;
	}

	function addTokenType(string calldata description, Limits calldata limits) external onlyOwner returns(uint256 len) {
		return _addTokenType(description, limits);
	}

	function _setTypeLimits(uint256 typeId, Limits memory limits) private {
		require(typeId < typeDescriptions.length, "AllowTokens: bigger than typeDescriptions");
		require(limits.max >= limits.min, "AllowTokens: maxTokens smaller than minTokens");
		require(limits.daily >= limits.max, "AllowTokens: dailyLimit smaller than maxTokens");
		require(limits.mediumAmount > limits.min, "AllowTokens: limits.mediumAmount smaller than min");
		require(limits.largeAmount > limits.mediumAmount, "AllowTokens: limits.largeAmount smaller than mediumAmount");
		typeLimits[typeId] = limits;
		emit TypeLimitsChanged(typeId, limits);
	}

	function setTypeLimits(uint256 typeId, Limits memory limits) public onlyOwner {
		_setTypeLimits(typeId, limits);
	}

	function getTypesLimits() external view override returns(Limits[] memory limits) {
		limits = new Limits[](typeDescriptions.length);
		for (uint256 i = 0; i < typeDescriptions.length; i++) {
			limits[i] = typeLimits[i];
		}
		return limits;
	}

	function getTypeDescriptionsLength() external view override returns(uint256) {
		return typeDescriptions.length;
	}

	function getTypeDescriptions() external view override returns(string[] memory descriptions) {
		descriptions = new string[](typeDescriptions.length);
		for (uint256 i = 0; i < typeDescriptions.length; i++) {
			descriptions[i] = typeDescriptions[i];
		}
		return descriptions;
	}

	function isTokenAllowed(uint256 chainId, address token) public view notNull(token) override returns (bool) {
		return tokenInfo(chainId, token).allowed;
	}

	function setToken(uint256 chainId, address token, uint256 typeId) override public notNull(token) {
		require(isOwner() || _msgSender() == primary(), "AllowTokens: unauthorized sender");
		require(typeId < typeDescriptions.length, "AllowTokens: typeId does not exist");
		TokenInfo memory info = tokenInfo(chainId, token);
		info.allowed = true;
		info.typeId = typeId;
		setTokenInfoByTokenAddress(chainId, token, info);
		emit SetToken(chainId, token, typeId);
	}

	function setMultipleTokens(uint256 chainId, TokensAndType[] calldata tokensAndTypes) external onlyOwner {
		require(tokensAndTypes.length > 0, "AllowTokens: empty tokens");
		for(uint256 i = 0; i < tokensAndTypes.length; i = i + 1) {
			setToken(chainId, tokensAndTypes[i].token, tokensAndTypes[i].typeId);
		}
	}

	function removeAllowedToken(uint256 chainId, address token) external notNull(token) onlyOwner {
		TokenInfo memory info = tokenInfo(chainId, token);
		require(info.allowed, "AllowTokens: Not Allowed");
		info.allowed = false;
		setTokenInfoByTokenAddress(chainId, token, info);
		emit AllowedTokenRemoved(chainId, token);
	}

	function setConfirmations(
		uint256 _smallAmountConfirmations,
		uint256 _mediumAmountConfirmations,
		uint256 _largeAmountConfirmations) external onlyOwner {
		_setConfirmations(_smallAmountConfirmations, _mediumAmountConfirmations, _largeAmountConfirmations);
	}

	function _setConfirmations(
		uint256 _smallAmountConfirmations,
		uint256 _mediumAmountConfirmations,
		uint256 _largeAmountConfirmations) private {
		require(_smallAmountConfirmations <= _mediumAmountConfirmations, "AllowTokens: small bigger than medium confirmations");
		require(_mediumAmountConfirmations <= _largeAmountConfirmations, "AllowTokens: medium bigger than large confirmations");
		smallAmountConfirmations = _smallAmountConfirmations;
		mediumAmountConfirmations = _mediumAmountConfirmations;
		largeAmountConfirmations = _largeAmountConfirmations;
		emit ConfirmationsChanged(_smallAmountConfirmations, _mediumAmountConfirmations, _largeAmountConfirmations);
	}

	function getConfirmations() external view override
		returns (
		uint256 smallAmount,
		uint256 mediumAmount,
		uint256 largeAmount
	) {
		return (smallAmountConfirmations, mediumAmountConfirmations, largeAmountConfirmations);
	}

}
