pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface IAllowTokens {

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

    function allowedContracts(address sender) external view returns (bool);

    function version() external pure returns (string memory);

    function getInfoAndLimits(address token) external view returns (TokenInfo memory info, Limits memory limit);

    function calcMaxWithdraw(address token) external view returns (uint256 maxWithdraw);

    function getTypeDescriptionsLength() external view returns(uint256);

    function getTypeDescriptions(uint index) external view returns(string memory);

    function setToken(address token, uint256 typeId) external;

    function getConfirmations() external view returns (uint256 smallAmount, uint256 mediumAmount, uint256 largeAmount);

    function isTokenAllowed(address token) external view returns (bool);

    function updateTokenTransfer(address token, uint256 amount) external returns(uint256 typeId);
}