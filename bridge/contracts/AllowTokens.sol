pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/math/SafeMath.sol";
import "./zeppelin/ownership/Ownable.sol";

contract AllowTokens is Ownable {
    using SafeMath for uint256;

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
    event DailyLimitChange(uint256 dailyLimit);

    modifier notNull(address _address) {
        require(_address != address(0), "Address cannot be empty");
        _;
    }

    constructor(address _manager) public  {
        transferOwnership(_manager);
        validateAllowedTokens = true;
        maxTokensAllowed = 10000 ether;
        minTokensAllowed = 1 ether;
        dailyLimit = 100000 ether;
    }

    function isValidatingAllowedTokens() public view returns(bool) {
        return validateAllowedTokens;
    }

    function getMaxTokensAllowed() public view returns(uint256) {
        return maxTokensAllowed;
    }

    function getMinTokensAllowed() public view returns(uint256) {
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

    function addAllowedToken(address token) public onlyOwner {
        require(!allowedTokenExist(token), "Token already exists");
        allowedTokens[token] = true;
        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) public onlyOwner {
        require(allowedTokenExist(token), "Token does not exist");
        allowedTokens[token] = false;
        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() public onlyOwner {
        validateAllowedTokens = true;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function disableAllowedTokensValidation() public onlyOwner {
        validateAllowedTokens = false;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function setMaxTokensAllowed(uint256 maxTokens) public onlyOwner {
        maxTokensAllowed = maxTokens;
        emit MaxTokensAllowedChanged(maxTokensAllowed);
    }

    function setMinTokensAllowed(uint256 minTokens) public onlyOwner {
        minTokensAllowed = minTokens;
        emit MinTokensAllowedChanged(minTokensAllowed);
    }

    function changeDailyLimit(uint256 _dailyLimit) public onlyOwner {
        dailyLimit = _dailyLimit;
        emit DailyLimitChange(_dailyLimit);
    }

}
