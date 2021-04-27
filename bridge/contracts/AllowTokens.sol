pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./zeppelin/math/SafeMath.sol";
// Upgradables
import "./zeppelin/upgradable/Initializable.sol";
import "./zeppelin/upgradable/ownership/UpgradableOwnable.sol";
import "./zeppelin/upgradable/ownership/UpgradableSecondary.sol";

contract AllowTokens is Initializable, UpgradableOwnable, UpgradableSecondary {
    using SafeMath for uint256;

    address constant private NULL_ADDRESS = address(0);
    uint256 constant public MAX_TYPES = 250;
    bool public isValidatingAllowedTokens;
    mapping (address => bool) public allowedContracts;
    mapping (address => TokenInfo) public allowedTokens;
    mapping (uint256 => Limits) public typeLimits;
    address public bridge;
    uint256 public smallAmountConfirmations;
    uint256 public mediumAmountConfirmations;
    uint256 public largeAmountConfirmations;
    string[] typeDescriptions;

    struct Limits {
        uint256 min;
        uint256 max;
        uint256 daily;
        uint256 mediumAmount;
        uint256 largeAmount;
    }

    struct TokenInfo {
        bool allowed;
        uint256 typeId;
        uint256 spentToday;
        uint256 lastDay;
    }

    struct TypeInfo {
        string description;
        Limits limits;
    }

    struct TokensAndType {
        address token;
        uint256 typeId;
    }

    event SetToken(address indexed _tokenAddress, uint256 _typeId);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);
    event AllowedContractAdded(address indexed _contractAddress);
    event AllowedContractRemoved(address indexed _contractAddress);
    event TokenTypeAdded(uint256 indexed _typeId, string _typeDescription);
    event TypeLimitsChanged(uint256 indexed _typeId, Limits limits);
    event UpdateTokensTransfered(address indexed _tokenAddress, uint256 _lastDay, uint256 _spentToday);
    event ConfirmationsChanged(uint256 _smallAmountConfirmations, uint256 _mediumAmountConfirmations, uint256 _largeAmountConfirmations);


    modifier notNull(address _address) {
        require(_address != NULL_ADDRESS, "AllowTokens: Address cannot be empty");
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
        UpgradableSecondary.initialize(_primary);
        _setConfirmations(_smallAmountConfirmations, _mediumAmountConfirmations, _largeAmountConfirmations);
        isValidatingAllowedTokens = true;
        for(uint i = 0; i < typesInfo.length; i = i + 1) {
            _addTokenType(typesInfo[i].description, typesInfo[i].limits);
        }
    }

    function version() external pure returns (string memory) {
        return "v1";
    }

    function getInfoAndLimits(address token) public view returns (TokenInfo memory info, Limits memory limit) {
        info = allowedTokens[token];
        limit = typeLimits[info.typeId];
        return (info, limit);
    }
    function calcMaxWithdraw(address token) public view returns (uint256 maxWithdraw) {
        (TokenInfo memory info, Limits memory limits) = getInfoAndLimits(token);
        return _calcMaxWithdraw(info, limits);
    }

    function _calcMaxWithdraw(TokenInfo memory info, Limits memory limits) private view returns (uint256 maxWithdraw) {
        // solium-disable-next-line security/no-block-members
        if (now > info.lastDay + 24 hours) {
            info.spentToday = 0;
        }
        if (limits.daily <= info.spentToday)
            return 0;
        maxWithdraw = limits.daily - info.spentToday;
        if(maxWithdraw > limits.max)
            maxWithdraw = limits.max;
        return maxWithdraw;
    }

    // solium-disable-next-line max-len
    function updateTokenTransfer(address token, uint256 amount) external onlyPrimary returns(uint256 typeId){
        (TokenInfo memory info, Limits memory limit) = getInfoAndLimits(token);
        if(isValidatingAllowedTokens) {
            require(isTokenAllowed(token), "AllowTokens: Token not whitelisted");
            require(amount >= limit.min, "AllowTokens: Amount lower than limit");
             // solium-disable-next-line security/no-block-members
            if (now > info.lastDay + 24 hours) {
                // solium-disable-next-line security/no-block-members
                info.lastDay = now;
                info.spentToday = 0;
            }
            uint maxWithdraw = _calcMaxWithdraw(info, limit);
            require(amount <= maxWithdraw, "AllowTokens: Amount bigger than limit");
            info.spentToday = info.spentToday.add(amount);
            allowedTokens[token] = info;
            emit UpdateTokensTransfered(token, info.lastDay, info.spentToday);
        }
        return info.typeId;
    }

    function _addTokenType(string memory description, Limits memory limits) private returns(uint256 len) {
        require(bytes(description).length > 0, "AllowTokens: Empty description");
        len = typeDescriptions.length;
        require(len + 1 <= MAX_TYPES, "AllowTokens: Reached MAX_TYPES limit");
        typeDescriptions.push(description);
        _setTypeLimits(len, limits);
        emit TokenTypeAdded(len, description);
        return len;
    }

    function addTokenType(string calldata description, Limits calldata limits) external onlyOwner returns(uint256 len) {
        return _addTokenType(description, limits);
    }

    function _setTypeLimits(uint256 typeId, Limits memory limits) private {
        require(typeId < typeDescriptions.length, "AllowTokens: bigger than typeDescriptions length");
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

    function getTypeDescriptionsLength() external view returns(uint256) {
        return typeDescriptions.length;
    }

    function getTypeDescriptions(uint index) external view returns(string memory) {
        return typeDescriptions[index];
    }

    function addAllowedContract(address _contract) external notNull(_contract) onlyOwner {
        allowedContracts[_contract] = true;
        emit AllowedContractAdded(_contract);
    }

    function removeAllowedContract(address _contract) external notNull(_contract) onlyOwner {
        allowedContracts[_contract] = false;
        emit AllowedContractRemoved(_contract);
    }

    function isTokenAllowed(address token) public view notNull(token) returns (bool) {
        if (isValidatingAllowedTokens) {
            return allowedTokens[token].allowed;
        }
        return true;
    }

    function setToken(address token, uint256 typeId) public notNull(token) {
        require(isOwner() || _msgSender() == primary(), "AllowTokens: unauthorized sender");
        require(typeId < typeDescriptions.length, "AllowTokens: typeId does not exist");
        TokenInfo memory info = allowedTokens[token];
        info.allowed = true;
        info.typeId = typeId;
        allowedTokens[token] = info;
        emit SetToken(token, typeId);
    }

    function setMultipleTokens(TokensAndType[] calldata tokensAndTypes) external onlyOwner {
        require(tokensAndTypes.length > 0, "AllowTokens: empty tokens");
        for(uint256 i = 0; i < tokensAndTypes.length; i = i + 1) {
            setToken(tokensAndTypes[i].token, tokensAndTypes[i].typeId);
        }
    }

    function removeAllowedToken(address token) external notNull(token) onlyOwner {
        TokenInfo memory info = allowedTokens[token];
        require(info.allowed, "AllowTokens: Token does not exis in allowedTokens");
        info.allowed = false;
        allowedTokens[token] = info;
        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() external onlyOwner {
        isValidatingAllowedTokens = true;
        emit AllowedTokenValidation(isValidatingAllowedTokens);
    }

    function disableAllowedTokensValidation() external onlyOwner {
        isValidatingAllowedTokens = false;
        emit AllowedTokenValidation(isValidatingAllowedTokens);
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

    function getConfirmations() external view returns (uint256 smallAmount, uint256 mediumAmount, uint256 largeAmount) {
        return (smallAmountConfirmations, mediumAmountConfirmations, largeAmountConfirmations);
    }

}
