// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBridgeV2 {function version() external pure returns (string memory);

    function getFeePercentage() external view returns(uint);

    function calcMaxWithdraw() external view returns (uint);

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokens(address tokenToUse, uint256 amount) external returns(bool);

    /**
     * ERC-777 tokensReceived hook allows to send tokens to a contract and notify it in a single transaction
     * See https://eips.ethereum.org/EIPS/eip-777#motivation for details
     */
    function tokensReceived (
        address operator,
        address from,
        address to,
        uint amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external;

    /**
     * Accepts the transaction from the other chain that was voted and sent by the federation contract
     */
    function acceptTransfer(
        address originalTokenAddress,
        address receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity
    ) external returns(bool);

    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol, bytes _userData,
        uint8 _decimals, uint256 _granularity);
    event NewSideToken(address indexed _newSideTokenAddress, address indexed _originalTokenAddress, string _newSymbol, uint256 _granularity);
    event AcceptedCrossTransfer(address indexed _tokenAddress, address indexed _to, uint256 _amount, uint8 _decimals, uint256 _granularity,
        uint256 _formattedAmount, uint8 _calculatedDecimals, uint256 _calculatedGranularity);
    event FeePercentageChanged(uint256 _amount);
}