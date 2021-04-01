pragma solidity ^0.5.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";

interface IBridge {
    function version() external pure returns (string memory);

    function getFeePercentage() external view returns(uint);

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(address tokenToUse, address to, uint256 amount) external;

    /**
     * Use network currency and cross it.
     */
    function depositTo(address to) external payable;

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
     * Accepts the transaction from the other chain that was voted and sent by the Federation contract
     */
    function acceptTransfer(
        address originalTokenAddress,
        address sender,
        address payable receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity,
        uint256 typeId
    ) external;

    event Cross(
        address indexed _tokenAddress,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        string _symbol,
        bytes _userData,
        uint8 _decimals,
        uint256 _granularity,
        uint256 _typeId
    );
    event NewSideToken(
        address indexed _newSideTokenAddress,
        address indexed _originalTokenAddress,
        string _newSymbol,
        uint256 _granularity
    );
    event AcceptedCrossTransfer(
        address indexed _tokenAddress,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        uint8 _decimals,
        uint256 _granularity,
        uint256 _formattedAmount,
        uint8 _calculatedDecimals,
        uint256 _calculatedGranularity,
        uint256 _typeId);
    event FeePercentageChanged(uint256 _amount);
}