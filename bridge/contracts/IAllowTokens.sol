pragma solidity ^0.5.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";

interface IAllowTokens {

    function getAllowedTokens() external view returns(address[] memory);

    function isValidatingAllowedTokens() external view returns(bool);

    function getMaxTokensAllowed() external view returns(uint256);

    function isTokenAllowed(address token) external view returns (bool);

    function addAllowedToken(address token) external;

    function removeAllowedToken(address token) external;

     function enableAllowedTokensValidation() external;

    function disableAllowedTokensValidation() external;

    function setMaxTokensAllowed(uint256 maxTokens) external;
}
