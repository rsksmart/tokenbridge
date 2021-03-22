pragma solidity >=0.4.21 <0.6.0;
pragma experimental ABIEncoderV2;

import "./zeppelin/math/SafeMath.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./zeppelin/ownership/Secondary.sol";

contract AllowTokens is Ownable, Secondary {
    using SafeMath for uint256;

    address constant private NULL_ADDRESS = address(0);
    uint256 constant public MAX_TYPES = 250;
    bool public isValidatingAllowedTokens;
    mapping (address => bool) public allowedContracts;
    mapping (address => TokenInfo) public allowedTokens;
    mapping (uint256 => Limits) public typeLimits;
    address public bridge;
    string[] typeDescriptions;

    struct Limits {
        uint256 max;
        uint256 min;
        uint256 daily;
    }

    struct TokenInfo {
        bool allowed;
        uint256 typeId;
        uint256 spentToday;
        uint256 lastDay;
    }

    event SetToken(address indexed _tokenAddress, uint256 _typeId);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);
    event AllowedContractAdded(address indexed _contractAddress);
    event AllowedContractRemoved(address indexed _contractAddress);
    event TokenTypeAdded(uint256 indexed _typeId, string _typeDescription);
    event TypeLimitsChanged(uint256 indexed _typeId, uint256 _maxTokens, uint256 _minTokens, uint256 _dailyLimit);
    event UpdateTokensTransfered(address indexed _tokenAddress, uint256 _lastDay, uint256 _spentToday);

    modifier notNull(address _address) {
        require(_address != NULL_ADDRESS, "AllowTokens: Address cannot be empty");
        _;
    }

    constructor(address _manager) public  {
        transferOwnership(_manager);
        isValidatingAllowedTokens = true;
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
        (TokenInfo memory info, Limits memory limit) = getInfoAndLimits(token);
        return _calcMaxWithdraw(info, limit);
    }

    function _calcMaxWithdraw(TokenInfo memory info, Limits memory limit) private view returns (uint256 maxWithdraw) {
        // solium-disable-next-line security/no-block-members
        if (now > info.lastDay + 24 hours) {
            info.spentToday = 0;
        }
        if (limit.daily <= info.spentToday)
            return 0;
        maxWithdraw = limit.daily - info.spentToday;
        if(maxWithdraw > limit.max)
            maxWithdraw = limit.max;
        return maxWithdraw;
    }

    // solium-disable-next-line max-len
    function updateTokenTransfer(address token, uint256 amount, bool isSideToken) external onlyPrimary {
        if(isValidatingAllowedTokens) {
            (TokenInfo memory info, Limits memory limit) = getInfoAndLimits(token);
            require(isSideToken || isTokenAllowed(token), "AllowTokens: Token not whitelisted");
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
    }

    function addTokenType(string calldata description, uint256 max, uint256 min, uint256 daily) external onlyOwner returns(uint256) {
        require(bytes(description).length > 0, "AllowTokens: Empty description");
        uint256 len = typeDescriptions.length;
        require(len + 1 < MAX_TYPES, "AllowTokens: Reached MAX_TYPES limit");
        typeDescriptions.push(description);
        setTypeLimits(len, max, min, daily);
        emit TokenTypeAdded(len, description);
        return len;
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

    function setToken(address token, uint256 typeId) external notNull(token) onlyOwner {
        require(typeId < typeDescriptions.length, "AllowTokens: typeId does not exist");
        TokenInfo memory info = allowedTokens[token];
        info.allowed = true;
        info.typeId = typeId;
        allowedTokens[token] = info;
        emit SetToken(token, typeId);
    }

    function removeAllowedToken(address token) external notNull(token) onlyOwner {
        TokenInfo memory info = allowedTokens[token];
        require(info.allowed, "AllowTokens: Token does not exis  in allowedTokens");
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

    function setTypeLimits(uint256 typeId, uint256 maxTokens, uint256 minTokens, uint256 dailyLimit) public onlyOwner {
        require(typeId < typeDescriptions.length, "AllowTokens: bigger than typeDescriptions size");
        require(maxTokens >= minTokens, "AllowTokens: maxTokens smaller than minTokens");
        require(maxTokens >= minTokens, "AllowTokens: minTokens bigger than maxTokens");
        require(dailyLimit >= maxTokens, "AllowTokens: dailyLimit smaller than maxTokens");
        Limits memory limit = typeLimits[typeId];
        limit.max = maxTokens;
        limit.min = minTokens;
        limit.daily = dailyLimit;
        typeLimits[typeId] = limit;
        emit TypeLimitsChanged(typeId, maxTokens, minTokens, dailyLimit);
    }

}
