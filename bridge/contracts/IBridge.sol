pragma solidity ^0.5.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";

interface IBridge {
    function version() external pure returns (string memory);

    function getCrossingPayment() external view returns(uint);

    function calcMaxWithdraw() external view returns (uint);

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokens(address tokenToUse, uint256 amount) external payable returns(bool);

    /**
     * ERC-677 and ERC-223 implementation for Receiving Tokens Contracts
     * See https://github.com/ethereum/EIPs/issues/677 for details
     * See https://github.com/ethereum/EIPs/issues/223 for details
     */
    function tokenFallback(address from, uint amount, bytes calldata userData) external returns(bool);

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

    function acceptTransfer(
        address originalTokenAddress,
        address receiver, uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    ) external returns(bool);

    function transactionWasProcessed(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    ) external view returns(bool);

    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol, bytes userData);
    event NewSideToken(address indexed _newSideTokenAddress, address indexed _originalTokenAddress, string _newSymbol);
    event AcceptedCrossTransfer(address indexed _tokenAddress, address indexed _to, uint256 _amount);
    event CrossingPaymentChanged(uint256 _amount);
}