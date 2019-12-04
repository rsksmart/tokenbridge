pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/math/SafeMath.sol";
import "./zeppelin/ownership/Ownable.sol";

contract AllowTokens is Ownable {
    using SafeMath for uint256;

    address constant private NULL_ADDRESS = address(0);

    bool private validateAllowedTokens;

    mapping (address => bool) public allowedTokens;
    mapping (address => uint256) public maxTokensAllowed;
    mapping (address => uint256) public minTokensAllowed;
    mapping (address => uint256) public dailyLimit;

    event AllowedTokenAdded(address indexed _tokenAddress);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);
    event MaxTokensAllowedChanged(address indexed _tokenAddress, uint256 _maxTokens);
    event MinTokensAllowedChanged(address indexed _tokenAddress, uint256 _minTokens);
    event DailyLimitChanged(address indexed _tokenAddress, uint256 dailyLimit);

    modifier notNull(address _address) {
        require(_address != NULL_ADDRESS, "AllowTokens: Address cannot be empty");
        _;
    }

    modifier validLimits(address _token, uint _maxLimit, uint _minLimit, uint _dailyLimit) {
        require(_token != NULL_ADDRESS, "AllowTokens: Token can't be null");
        // solium-disable-next-line max-len
        require(_maxLimit >= _minLimit && _maxLimit <= _dailyLimit && _minLimit != 0 && _maxLimit != 0 && _dailyLimit != 0, "AllowTokens: Limits are invalid");
        _;
    }

    constructor(address _manager) public  {
        transferOwnership(_manager);
        validateAllowedTokens = true;
    }

    function isValidatingAllowedTokens() public view returns(bool) {
        return validateAllowedTokens;
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

    function addAllowedToken(address _token, uint _maxLimit, uint _minLimit, uint _dailyLimit) public onlyOwner
    validLimits(_token, _maxLimit, _minLimit, _dailyLimit) {
        require(!allowedTokenExist(_token), "AllowTokens: Token already exists in allowedTokens");
        allowedTokens[_token] = true;
        emit AllowedTokenAdded(_token);
        maxTokensAllowed[_token] = _maxLimit;
        emit MaxTokensAllowedChanged(_token, _maxLimit);
        minTokensAllowed[_token] = _minLimit;
        emit MinTokensAllowedChanged(_token, _minLimit);
        dailyLimit[_token] = _dailyLimit;
        emit DailyLimitChanged(_token, _dailyLimit);
    }

    function removeAllowedToken(address token) public onlyOwner {
        require(allowedTokenExist(token), "AllowTokens: Token does not exist in allowedTokens");
        allowedTokens[token] = false;
        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() public onlyOwner {
        validateAllowedTokens = true;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function disableAllowedTokensValidation() public onlyOwner {
        // Before disabling Allowed Tokens Validations some kind of contract validation system
        // should be implemented on the Bridge for the methods receiveTokens, tokenFallback and tokensReceived
        validateAllowedTokens = false;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function setMaxTokensAllowed(address _token, uint _maxLimit)
    public onlyOwner validLimits(_token, _maxLimit, minTokensAllowed[_token], dailyLimit[_token]) {
        maxTokensAllowed[_token] = _maxLimit;
        emit MaxTokensAllowedChanged(_token, _maxLimit);
    }

    function setMinTokensAllowed(address _token, uint minTokens)
    public onlyOwner validLimits(_token, maxTokensAllowed[_token], minTokens, dailyLimit[_token]) {
        minTokensAllowed[_token] = minTokens;
        emit MinTokensAllowedChanged(_token, minTokens);
    }

    function changeDailyLimit(address _token, uint _dailyLimit)
    public onlyOwner validLimits(_token, maxTokensAllowed[_token], minTokensAllowed[_token], _dailyLimit) {
        dailyLimit[_token] = _dailyLimit;
        emit DailyLimitChanged(_token, _dailyLimit);
    }

    // solium-disable-next-line max-len
    function isValidTokenTransfer(address _token, uint amount, uint spentToday, bool isSideToken) public view returns (bool) {
        if(validateAllowedTokens) {
            if(amount > maxTokensAllowed[_token])
                return false;
            if(amount < minTokensAllowed[_token])
                return false;
            if (spentToday + amount > dailyLimit[_token] || spentToday + amount < spentToday)
                return false;
            if(!isSideToken && !isTokenAllowed(_token))
                return false;
        }
        return true;
    }

    function calcMaxWithdraw(address _token, uint spentToday) public view returns (uint) {
        uint maxWithrow = dailyLimit[_token] - spentToday;
        if (dailyLimit[_token] < spentToday)
            return 0;
        if(maxWithrow > maxTokensAllowed[_token])
            maxWithrow = maxTokensAllowed[_token];
        return maxWithrow;
    }

}
