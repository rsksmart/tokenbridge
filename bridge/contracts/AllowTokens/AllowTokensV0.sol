// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/math/SafeMath.sol";
import "../zeppelin/ownership/Ownable.sol";

contract AllowTokensV0 is Ownable {
    using SafeMath for uint256;

    address constant private NULL_ADDRESS = address(0);

    mapping (address => bool) public allowedTokens;
    bool private validateAllowedTokens;
    uint256 private maxTokensAllowed;
    uint256 private minTokensAllowed;
    uint256 public dailyLimit;

    event AllowedTokenAdded(address indexed _tokenAddress);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);
    event MaxTokensAllowedChanged(uint256 _maxTokens);
    event MinTokensAllowedChanged(uint256 _minTokens);
    event DailyLimitChanged(uint256 dailyLimit);

    modifier notNull(address _address) {
        require(_address != NULL_ADDRESS, "AllowTokens: Address cannot be empty");
        _;
    }

    constructor(address _manager)  {
        transferOwnership(_manager);
        validateAllowedTokens = true;
        maxTokensAllowed = 10000 ether;
        minTokensAllowed = 1 ether;
        dailyLimit = 100000 ether;
    }

    function isValidatingAllowedTokens() external view returns(bool) {
        return validateAllowedTokens;
    }

    function getMaxTokensAllowed() external view returns(uint256) {
        return maxTokensAllowed;
    }

    function getMinTokensAllowed() external view returns(uint256) {
        return minTokensAllowed;
    }

    function allowedTokenExist(address token) private view notNull(token) returns (bool) {
        return allowedTokens[token];
    }

    function isTokenAllowed(address token) public view notNull(token) returns (bool) {
        if (validateAllowedTokens) {
            return allowedTokenExist(token);
        }
        return true;
    }

    function addAllowedToken(address token) external onlyOwner {
        require(!allowedTokenExist(token), "AllowTokens: Token already exists in allowedTokens");
        allowedTokens[token] = true;
        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) external onlyOwner {
        require(allowedTokenExist(token), "AllowTokens: Token does not exis  in allowedTokenst");
        allowedTokens[token] = false;
        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() external onlyOwner {
        validateAllowedTokens = true;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function disableAllowedTokensValidation() external onlyOwner {
        // Before disabling Allowed Tokens Validations some kind of contract validation system
        // should be implemented on the Bridge for the methods receiveTokens, tokenFallback and tokensReceived
        validateAllowedTokens = false;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function setMaxTokensAllowed(uint256 maxTokens) external onlyOwner {
        require(maxTokens >= minTokensAllowed, "AllowTokens: Max Tokens should be equal or bigger than Min Token");
        maxTokensAllowed = maxTokens;
        emit MaxTokensAllowedChanged(maxTokensAllowed);
    }

    function setMinTokensAllowed(uint256 minTokens) external onlyOwner {
        require(maxTokensAllowed >= minTokens, "AllowTokens: minTokens should be equal or smaller than maxTokens");
        minTokensAllowed = minTokens;
        emit MinTokensAllowedChanged(minTokensAllowed);
    }

    function changeDailyLimit(uint256 _dailyLimit) external onlyOwner {
        require(_dailyLimit >= maxTokensAllowed, "AllowTokens: dailyLimit should be equal or bigger than maxTokens");
        dailyLimit = _dailyLimit;
        emit DailyLimitChanged(_dailyLimit);
    }

    // solium-disable-next-line max-len
    function isValidTokenTransfer(address tokenToUse, uint amount, uint spentToday, bool isSideToken) external view returns (bool) {
        if(amount > maxTokensAllowed)
            return false;
        if(amount < minTokensAllowed)
            return false;
        if (spentToday + amount > dailyLimit || spentToday + amount < spentToday)
            return false;
        if(!isSideToken && !isTokenAllowed(tokenToUse))
            return false;
        return true;
    }

    function calcMaxWithdraw(uint spentToday) external view returns (uint) {
        uint maxWithrow = dailyLimit - spentToday;
        if (dailyLimit < spentToday)
            return 0;
        if(maxWithrow > maxTokensAllowed)
            maxWithrow = maxTokensAllowed;
        return maxWithrow;
    }

}
