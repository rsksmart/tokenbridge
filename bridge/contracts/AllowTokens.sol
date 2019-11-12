pragma solidity >=0.4.21 <0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "./zeppelin/math/SafeMath.sol";

contract AllowTokens is Ownable {
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

    constructor(address _manager) public  {
        transferOwnership(_manager);
        validateAllowedTokens = false;
        maxTokensAllowed = 10000 ether;
    }

    function allowedTokenExist(address token) private view notNull(token) returns (bool) {
        for (uint i; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == token)
                return true;
        }
        return false;
    }

    function isTokenAllowed(address token) public view notNull(token) returns (bool) {
        if (validateAllowedTokens) {
            return allowedTokenExist(token);
        }
        return true;
    }

    function addAllowedToken(address token) public onlyOwner {
        require(!allowedTokenExist(token), "Token does not exist");

        allowedTokens.push(token);
        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) public onlyOwner {
        require(allowedTokenExist(token), "Token already exist");

        for (uint i = 0; i < allowedTokens.length - 1; i++)
            if (allowedTokens[i] == token) {
                allowedTokens[i] = allowedTokens[allowedTokens.length - 1];
                break;
            }
        allowedTokens.length -= 1;

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
}
