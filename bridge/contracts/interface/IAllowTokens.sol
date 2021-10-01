// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;
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

	function version() external pure returns (string memory);

	function getInfoAndLimits(uint256 chainId, address token) external view returns (TokenInfo memory info, Limits memory limit);

	function calcMaxWithdraw(uint256 chainId, address token) external view returns (uint256 maxWithdraw);

	function getTypesLimits() external view returns(Limits[] memory limits);

	function getTypeDescriptionsLength() external view returns(uint256);

	function getTypeDescriptions() external view returns(string[] memory descriptions);

	function setToken(uint256 chainId, address token, uint256 typeId) external;

	function getConfirmations() external view returns (uint256 smallAmount, uint256 mediumAmount, uint256 largeAmount);

	function isTokenAllowed(uint256 chainId, address token) external view returns (bool);

	function updateTokenTransfer(uint256 chainId, address token, uint256 amount) external;
}