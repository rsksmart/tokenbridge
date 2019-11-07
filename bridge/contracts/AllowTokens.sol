pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/math/SafeMath.sol";
import "./Governance.sol";

contract AllowTokens is Governance {
    using SafeMath for uint256;

    address[] public allowedTokens;
    bool public validateAllowedTokens;
    uint256 public maxTokensAllowed;

    event AllowedTokenAdded(address indexed _tokenAddress);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);
    event MaxTokensAllowedChanged(uint256 _maxTokens);

    modifier notNull(address _address) {
        require(_address != address(0), "Address cannot be empty");
        _;
    }

    constructor(address _manager) public Governance(_manager) {
        validateAllowedTokens = false;
        maxTokensAllowed = 10000 ether;
    }

    function allowedTokenExist(address token) private view returns (bool) {
        if (token == address(0))
            return false;

        for (uint i; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == token)
                return true;
        }
        return false;
    }

    function isTokenAllowed(address token) public view returns (bool) {
        if (validateAllowedTokens) {
            return allowedTokenExist(token);
        }
        return true;
    }

    function addAllowedToken(address token) public onlyManager notNull(token) {
        require(!allowedTokenExist(token), "Token does not exist");

        allowedTokens.push(token);
        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) public onlyManager {
        require(allowedTokenExist(token), "Token already exist");

        for (uint i = 0; i < allowedTokens.length - 1; i++)
            if (allowedTokens[i] == token) {
                allowedTokens[i] = allowedTokens[allowedTokens.length - 1];
                break;
            }
        allowedTokens.length -= 1;

        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() public onlyManager {
        validateAllowedTokens = true;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function disableAllowedTokensValidation() public onlyManager {
        validateAllowedTokens = false;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function setMaxTokensAllowed(uint256 maxTokens) public onlyManager {
        maxTokensAllowed = maxTokens;
        emit MaxTokensAllowedChanged(maxTokensAllowed);
    }
}
